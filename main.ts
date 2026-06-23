/**
 * Extensão Completa: LCD I2C, Teclado PCF8574, Cofre e Calculadora
 */
//% weight=100 color=#0066cc icon="\uf11c" block="Super Kit I2C"
namespace superKitI2C {

    let senhaCorreta = "1234"
    let senhaDigitada = ""
    let visorCalculadora = ""
    let lcdAddr = 0x27

    // Mapeamento padrão do teclado 4x4 (Linhas x Colunas)
    const mapaTeclas = [
        ["1", "2", "3", "A"],
        ["4", "5", "6", "B"],
        ["7", "8", "9", "C"],
        ["*", "0", "#", "D"]
    ];

    // --- SEÇÃO 1: COMANDOS DO LCD I2C ---

    function i2cLcdWrite(data: number, mode: number) {
        let highnib = data & 0xf0
        let lownib = (data << 4) & 0xf0
        // 0x08 garante a luz de fundo ligada (Backlight ON)
        pins.i2cWriteNumber(lcdAddr, highnib | mode | 0x08 | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, highnib | mode | 0x08, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | 0x08 | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | 0x08, NumberFormat.Int8LE)
    }

    /**
     * Inicializa a tela LCD I2C no endereço especificado (geralmente 0x27 ou 0x3F)
     */
    //% block="[LCD] Inicializar no endereço I2C %addr"
    //% addr.defl=0x27
    export function lcdInit(addr: number): void {
        lcdAddr = addr
        basic.pause(50)
        i2cLcdWrite(0x33, 0)
        basic.pause(5)
        i2cLcdWrite(0x32, 0)
        i2cLcdWrite(0x28, 0) // 4 bits, 2 linhas
        i2cLcdWrite(0x0C, 0) // Display ON, Cursor OFF
        i2cLcdWrite(0x06, 0) // Auto incrementar cursor
        i2cLcdWrite(0x01, 0) // Limpar tela
        basic.pause(2)
    }

    /**
     * Limpa completamente a tela do LCD
     */
    //% block="[LCD] Limpar Tela"
    export function lcdClear(): void {
        i2cLcdWrite(0x01, 0)
        basic.pause(2)
    }

    /**
     * Exibe um texto no LCD em uma linha e coluna específicas
     */
    //% block="[LCD] Mostrar texto %texto na Coluna %col Linha %linha"
    //% col.min=0 col.max=15 linha.min=0 linha.max=1
    export function lcdShowString(texto: string, col: number, linha: number): void {
        let offsets = [0x00, 0x40]
        i2cLcdWrite(0x80 | (offsets[linha] + col), 0)
        for (let i = 0; i < texto.length; i++) {
            i2cLcdWrite(texto.charCodeAt(i), 1)
        }
    }


    // --- SEÇÃO 2: COMANDOS DO TECLADO PCF8574 ---

    /**
     * Lê qual tecla foi pressionada no teclado 4x4 via expansor PCF8574
     * @param pcfAddr endereço I2C do PCF8574 (geralmente 0x20 ou 0x38)
     */
    //% block="[Teclado] Ler tecla pressionada no endereço I2C %pcfAddr"
    //% pcfAddr.defl=0x20
    export function lerTeclado(pcfAddr: number): string {
        // Varre as linhas mandando nível baixo (0) e lê as colunas
        for (let l = 0; l < 4; l++) {
            // Define a linha atual como 0 e o resto como 1 (P0 a P3 são linhas, P4 a P7 colunas)
            let mascaraConstruida = 0xFF & ~(1 << l);
            pins.i2cWriteNumber(pcfAddr, mascaraConstruida, NumberFormat.Int8LE);

            let leitura = pins.i2cReadNumber(pcfAddr, NumberFormat.Int8LE);
            // Inverte e isola os 4 bits superiores (P4 a P7) correspondentes às colunas
            let colRead = (~leitura >> 4) & 0x0F;

            if (colRead > 0) {
                for (let c = 0; c < 4; c++) {
                    if (colRead & (1 << c)) {
                        // Debounce básico para evitar leituras duplicadas
                        basic.pause(200);
                        return mapaTeclas[l][c];
                    }
                }
            }
        }
        return ""; // Nenhuma tecla pressionada
    }


    // --- SEÇÃO 3: LÓGICA DE SENHA, SCROLL E CALCULADORA ---

    /**
     * Configura a senha correta do sistema
     */
    //% block="[Cofre] Definir senha para %novaSenha"
    //% novaSenha.defl="1234"
    export function configurarSenha(novaSenha: string): void {
        senhaCorreta = novaSenha;
        senhaDigitada = "";
    }

    /**
     * Processa a tecla digitada no modo cofre e devolve os asteriscos ou o status
     */
    //% block="[Cofre] Processar tecla %tecla"
    export function processarCofre(tecla: string): string {
        if (tecla == "") return "MANTER";

        if (tecla == "#") {
            if (senhaDigitada == senhaCorreta) {
                senhaDigitada = "";
                return "ACESSO LIBERADO";
            } else {
                senhaDigitada = "";
                return "SENHA INCORRETA";
            }
        } else if (tecla == "*") {
            senhaDigitada = "";
            return "LIMPO";
        } else {
            if (senhaDigitada.length < 16) {
                senhaDigitada += tecla;
            }
            let segredo = "";
            for (let i = 0; i < senhaDigitada.length; i++) {
                segredo += "*";
            }
            return segredo;
        }
    }

    /**
     * Gera o efeito letreiro/rolagem de texto para o LCD
     */
    //% block="[Efeito] Rolar texto %texto no passo %passo"
    //% texto.defl="Insira a Senha:    "
    export function gerarTextoScroll(texto: string, passo: number): string {
        if (texto.length <= 16) return texto;
        let index = passo % texto.length;
        let res = texto.substr(index, 16);
        if (res.length < 16) {
            res += texto.substr(0, 16 - res.length);
        }
        return res;
    }

    /**
     * Processa o teclado no modo Calculadora (A=+, B=-, C=*, D=/, #==, *=Limpar)
     */
    //% block="[Calculadora] Processar tecla %tecla"
    export function processarCalculadora(tecla: string): string {
        if (tecla == "") return visorCalculadora;

        if (tecla == "A") { visorCalculadora += "+"; }
        else if (tecla == "B") { visorCalculadora += "-"; }
        else if (tecla == "C") { visorCalculadora += "*"; }
        else if (tecla == "D") { visorCalculadora += "/"; }
        else if (tecla == "*") { visorCalculadora = ""; }
        else if (tecla == "#") {
            try {
                let op = "";
                if (visorCalculadora.indexOf("+") > 0) op = "+";
                else if (visorCalculadora.indexOf("-") > 0) op = "-";
                else if (visorCalculadora.indexOf("*") > 0) op = "*";
                else if (visorCalculadora.indexOf("/") > 0) op = "/";

                if (op != "") {
                    let partes = visorCalculadora.split(op);
                    let n1 = parseFloat(partes[0]);
                    let n2 = parseFloat(partes[1]);
                    if (op == "+") visorCalculadora = (n1 + n2).toString();
                    if (op == "-") visorCalculadora = (n1 - n2).toString();
                    if (op == "*") visorCalculadora = (n1 * n2).toString();
                    if (op == "/") visorCalculadora = n2 != 0 ? (n1 / n2).toString() : "Erro /0";
                }
            } catch (e) {
                visorCalculadora = "Erro";
            }
        } else {
            visorCalculadora += tecla;
        }
        return visorCalculadora;
    }
}