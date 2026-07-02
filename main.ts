namespace superKitI2C {

    let senhaCorreta = "1234"
    let senhaDigitada = ""
    let lcdAddr = 0x27
    let backlightState = 0x08 // 0x08 = Ligado, 0x00 = Desligado

    // Variáveis internas da Calculadora de 2 operandos
    let calcNumero1 = 0
    let calcNumero2 = 0
    let calcOperacao = ""
    let calcEmSegundoNumero = false
    let calcVisor = "0"

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
        pins.i2cWriteNumber(lcdAddr, highnib | mode | backlightState | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, highnib | mode | backlightState, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | backlightState | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | backlightState, NumberFormat.Int8LE)
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
        i2cLcdWrite(0x28, 0) // 4 bits, 2 linhas, fonte 5x8
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
     * Liga ou desliga a luz de fundo (backlight) do LCD
     */
    //% block="[LCD] Luz de fundo %on"
    //% on.shadow="toggleOnOff"
    export function lcdBacklight(on: boolean): void {
        backlightState = on ? 0x08 : 0x00;
        i2cLcdWrite(0x00, 0);
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

    /**
     * Cria um caractere customizado inserindo os valores binários de 5 bits para cada linha.
     * Use o formato 0bXXXXX (Ex: Coração L2 = 0b01010)
     * @param slot número do slot de memória (0 a 7)
     */
    //% block="[LCD Símbolo] Criar no Slot %slot | L1 %b1 L2 %b2 L3 %b3 L4 %b4 L5 %b5 L6 %b6 L7 %b7 L8 %b8"
    //% slot.min=0 slot.max=7
    //% b1.defl=0b00000 b2.defl=0b01010 b3.defl=0b11111 b4.defl=0b11111
    //% b5.defl=0b01110 b6.defl=0b00100 b7.defl=0b00000 b8.defl=0b00000
    export function lcdCriarSimboloBinario(slot: number, b1: number, b2: number, b3: number, b4: number, b5: number, b6: number, b7: number, b8: number): void {
        let bytes = [b1, b2, b3, b4, b5, b6, b7, b8];
        i2cLcdWrite(0x40 | (slot << 3), 0);
        for (let k = 0; k < 8; k++) {
            i2cLcdWrite(bytes[k], 1);
        }
    }

    /**
     * Desenha na tela um símbolo customizado que foi salvo previamente em um Slot (0 a 7)
     */
    //% block="[LCD Símbolo] Escrever Slot %slot na Coluna %col Linha %linha"
    //% slot.min=0 slot.max=7 col.min=0 col.max=15 linha.min=0 linha.max=1
    export function lcdPrintCustomChar(slot: number, col: number, linha: number): void {
        let offsets2 = [0x00, 0x40];
        i2cLcdWrite(0x80 | (offsets2[linha] + col), 0);
        i2cLcdWrite(slot, 1);
    }


    // --- SEÇÃO 2: COMANDOS DO TECLADO PCF8574 ---

    /**
     * Lê qual tecla foi pressionada no teclado 4x4 via expansor PCF8574
     * @param pcfAddr endereço I2C do PCF8574 (geralmente 0x20 ou 0x38)
     */
    //% block="[Teclado] Ler tecla pressionada no endereço I2C %pcfAddr"
    //% pcfAddr.defl=0x20
    export function lerTeclado(pcfAddr: number): string {
        for (let l = 0; l < 4; l++) {
            let mascaraConstruida = 0xFF & ~(1 << l);
            pins.i2cWriteNumber(pcfAddr, mascaraConstruida, NumberFormat.Int8LE);

            let leitura = pins.i2cReadNumber(pcfAddr, NumberFormat.Int8LE);
            let colRead = (~leitura >> 4) & 0x0F;

            if (colRead > 0) {
                for (let c = 0; c < 4; c++) {
                    if (colRead & (1 << c)) {
                        basic.pause(200);
                        return mapaTeclas[l][c];
                    }
                }
            }
        }
        return "";
    }


    // --- SEÇÃO 3: LÓGICA DE COFRE E SCROLL ---

    /**
     * Configura a senha correta do sistema de cofre
     */
    //% block="[Cofre] Definir senha para %novaSenha"
    //% novaSenha.defl="1234"
    export function configurarSenha(novaSenha: string): void {
        senhaCorreta = novaSenha;
        senhaDigitada = "";
    }

    /**
     * Processa a tecla digitada no modo cofre e devolve os asteriscos ou o status de validação
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
            for (let j = 0; j < senhaDigitada.length; j++) {
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


    // --- SEÇÃO 4: LÓGICA DA CALCULADORA MODULAR ---

    /**
     * Insere um número pressionado na lógica da calculadora
     * @param numTexto O dígito em string lido do teclado (0-9)
     */
    //% block="[Calculadora] Inserir Dígito %numTexto"
    export function calcInserirDigito(numTexto: string): void {
        if (numTexto == "A" || numTexto == "B" || numTexto == "C" || numTexto == "D" || numTexto == "*" || numTexto == "#" || numTexto == "") return;

        if (!calcEmSegundoNumero) {
            if (calcVisor == "0") {
                calcVisor = numTexto;
            } else {
                calcVisor += numTexto;
            }
            calcNumero1 = parseFloat(calcVisor);
        } else {
            if (calcVisor == calcOperacao) {
                calcVisor = numTexto;
            } else {
                calcVisor += numTexto;
            }
            calcNumero2 = parseFloat(calcVisor);
        }
    }

    /**
     * Define a operação matemática através das letras mapeadas (A=+, B=-, C=*, D=/)
     */
    //% block="[Calculadora] Definir Operação por Tecla %letca"
    export function calcDefirOperacao(letca: string): void {
        if (letca == "A") calcOperacao = "+";
        else if (letca == "B") calcOperacao = "-";
        else if (letca == "C") calcOperacao = "*";
        else if (letca == "D") calcOperacao = "/";
        else return;

        calcEmSegundoNumero = true;
        calcVisor = calcOperacao;
    }

    /**
     * Executa a conta dos dois números guardados com base na operação e retorna o resultado final
     */
    //% block="[Calculadora] Comando Calcular (=)"
    export function calcCalcular(): void {
        let resultado = 0;
        if (calcOperacao == "+") resultado = calcNumero1 + calcNumero2;
        else if (calcOperacao == "-") resultado = calcNumero1 + calcNumero2;
        else if (calcOperacao == "*") resultado = calcNumero1 * calcNumero2;
        else if (calcOperacao == "/") {
            if (calcNumero2 != 0) {
                resultado = calcNumero1 / calcNumero2;
            } else {
                calcVisor = "Erro /0";
                return;
            }
        } else {
            return;
        }

        calcVisor = resultado.toString();
        calcNumero1 = resultado;
        calcEmSegundoNumero = false;
    }

    /**
     * Reseta totalmente a memória da calculadora
     */
    //% block="[Calculadora] Limpar Tudo (C)"
    export function calcLimpar(): void {
        calcNumero1 = 0;
        calcNumero2 = 0;
        calcOperacao = "";
        calcEmSegundoNumero = false;
        calcVisor = "0";
    }

    /**
     * Retorna o texto atual que deve ser mostrado no visor do LCD da calculadora
     */
    //% block="[Calculadora] Obter Texto do Visor"
    export function calcObterVisor(): string {
        return calcVisor;
    }
}
