/**
 * Blocos Customizados para Teclado PCF8574, LCD I2C e Funções de Cofre/Calculadora
 */
//% weight=100 color=#0fbc11 icon="\uf11c" block="Segurança & Teclado"
namespace sistemaSeguro {

    let senhaCorreta = "1234"
    let senhaDigitada = ""
    let visorCalculadora = ""

    /**
     * Inicializa a senha correta do sistema de cofre
     * @param novaSenha a senha esperada, ex: "1234"
     */
    //% block="Definir senha do cofre para %novaSenha"
    //% novaSenha.defl="1234"
    export function configurarSenha(novaSenha: string): void {
        senhaCorreta = novaSenha;
        senhaDigitada = "";
    }

    /**
     * Processa a tecla pressionada no modo Cofre/Portão.
     * Retorna um texto de status para mandar para o LCD.
     * @param tecla a tecla detectada do PCF8574
     */
    //% block="Processar tecla %tecla no modo Cofre"
    export function processarCofre(tecla: string): string {
        if (tecla == "") return "SCROLL"; // Mantém o letreiro rodando

        if (tecla == "#") { // Tecla de confirmar
            if (senhaDigitada == senhaCorreta) {
                senhaDigitada = "";
                return "ACESSO LIBERADO";
            } else {
                senhaDigitada = "";
                return "SENHA INCORRETA";
            }
        } else if (tecla == "*") { // Tecla de limpar
            senhaDigitada = "";
            return "LIMPAR";
        } else {
            // Limita a senha em até 8 dígitos por segurança visual
            if (senhaDigitada.length < 8) {
                senhaDigitada += tecla;
            }
            // Retorna asteriscos correspondentes ao tamanho digitado
            let mascarado = "";
            for (let i = 0; i < senhaDigitada.length; i++) {
                mascarado += "*";
            }
            return mascarado;
        }
    }

    /**
     * Cria o efeito de Scroll (letreiro corrido) para textos longos no LCD 16x2.
     * @param texto frase completa a ser exibida
     * @param passo o índice/contador atual do scroll (mude em +1 a cada ciclo)
     */
    //% block="Cortar texto %texto para Scroll no passo %passo"
    //% texto.defl="Insira a Senha:    "
    export function gerarTextoScroll(texto: string, passo: number): string {
        if (texto.length <= 16) return texto;
        let indice = passo % texto.length;
        let resultado = texto.substr(indice, 16);
        if (resultado.length < 16) {
            resultado += texto.substr(0, 16 - resultado.length);
        }
        return resultado;
    }

    /**
     * Processa o teclado no modo Calculadora. 
     * Aceita números e as operações básicas (+, -, *, /) mapeadas nas letras A, B, C, D.
     * Retorna o texto atualizado para exibir no visor do LCD.
     * @param tecla tecla lida do PCF8574
     */
    //% block="Processar tecla %tecla no modo Calculadora"
    export function processarCalculadora(tecla: string): string {
        if (tecla == "") return visorCalculadora;

        if (tecla == "A") { visorCalculadora += "+"; }
        else if (tecla == "B") { visorCalculadora += "-"; }
        else if (tecla == "C") { visorCalculadora += "*"; }
        else if (tecla == "D") { visorCalculadora += "/"; }
        else if (tecla == "*") { visorCalculadora = ""; } // Limpa a conta
        else if (tecla == "#") {
            // Executa a conta básica de forma segura via código
            try {
                let resultado = avaliarExpressaoSimples(visorCalculadora);
                visorCalculadora = resultado.toString();
            } catch (e) {
                visorCalculadora = "Erro";
            }
        } else {
            visorCalculadora += tecla;
        }

        return visorCalculadora;
    }

    // Função interna auxiliar para resolver equações de String sem usar 'eval' inseguro
    function avaliarExpressaoSimples(expr: string): number {
        // Encontra o operador na string
        let op = "";
        if (expr.indexOf("+") > 0) op = "+";
        else if (expr.indexOf("-") > 0) op = "-";
        else if (expr.indexOf("*") > 0) op = "*";
        else if (expr.indexOf("/") > 0) op = "/";

        if (op == "") return parseFloat(expr);

        let partes = expr.split(op);
        let num1 = parseFloat(partes[0]);
        let num2 = parseFloat(partes[1]);

        if (op == "+") return num1 + num2;
        if (op == "-") return num1 - num2;
        if (op == "*") return num1 * num2;
        if (op == "/") return num2 != 0 ? num1 / num2 : 0;

        return 0;
    }
}