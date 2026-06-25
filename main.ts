/**
 * SuperKit I2C
 * LCD 16x2 + Teclado 4x4 + Calculadora + Cofre
 */

//% weight=100 color=#0066CC icon="\uf11c"
namespace superKitI2C {

    let lcdAddr = 0x27
    let backlight = 0x08

    let senhaCorreta = "1234"
    let senhaDigitada = ""

    let visor = ""

    let mapaTeclas = [
        ["1", "2", "3", "A"],
        ["4", "5", "6", "B"],
        ["7", "8", "9", "C"],
        ["*", "0", "#", "D"]
    ]

    // =========================
    // LCD
    // =========================

    function lcdWrite4Bits(value: number) {
        pins.i2cWriteNumber(lcdAddr, value | backlight, NumberFormat.UInt8BE)
    }

    function lcdPulseEnable(value: number) {
        lcdWrite4Bits(value | 0x04)
        control.waitMicros(1)
        lcdWrite4Bits(value & ~0x04)
        control.waitMicros(50)
    }

    function lcdSend(value: number, mode: number) {
        let high = value & 0xF0
        let low = (value << 4) & 0xF0

        lcdPulseEnable(high | mode)
        lcdPulseEnable(low | mode)
    }

    function lcdCommand(cmd: number) {
        lcdSend(cmd, 0)
    }

    function lcdData(data: number) {
        lcdSend(data, 1)
    }

    /**
     * Inicializar LCD
     */
    //% block="LCD iniciar endereço %addr"
    //% addr.defl=0x27
    export function lcdInit(addr: number) {

        lcdAddr = addr

        basic.pause(50)

        lcdCommand(0x33)
        lcdCommand(0x32)
        lcdCommand(0x28)
        lcdCommand(0x0C)
        lcdCommand(0x06)
        lcdCommand(0x01)

        basic.pause(5)
    }

    /**
     * Limpar LCD
     */
    //% block="LCD limpar"
    export function lcdClear() {
        lcdCommand(0x01)
        basic.pause(2)
    }

    /**
     * Escrever texto
     */
    //% block="LCD texto %txt coluna %col linha %lin"
    export function lcdShowString(txt: string, col: number, lin: number) {

        let offset = [0x00, 0x40]

        lcdCommand(0x80 | (offset[lin] + col))

        for (let i = 0; i < txt.length; i++) {
            lcdData(txt.charCodeAt(i))
        }
    }

    /**
     * Mostrar terminal
     */
    //% block="LCD mostrar terminal"
    export function lcdMostrarTerminal() {

        let txt = visor

        if (txt.length > 16) {
            txt = txt.substr(txt.length - 16, 16)
        }

        lcdClear()
        lcdShowString(txt, 0, 0)
    }

    // =========================
    // TECLADO PCF8574
    // =========================

    /**
     * Ler tecla
     */
    //% block="Ler tecla PCF8574 endereço %addr"
    //% addr.defl=0x20
    export function lerTecla(addr: number): string {

        for (let l = 0; l < 4; l++) {

            let mascara = 0xFF & ~(1 << l)

            pins.i2cWriteNumber(
                addr,
                mascara,
                NumberFormat.UInt8BE
            )

            let leitura =
                pins.i2cReadNumber(
                    addr,
                    NumberFormat.UInt8BE
                )

            let col = (~leitura >> 4) & 0x0F

            if (col > 0) {

                for (let c = 0; c < 4; c++) {

                    if (col & (1 << c)) {

                        basic.pause(200)

                        return mapaTeclas[l][c]
                    }
                }
            }
        }

        return ""
    }

    // =========================
    // TERMINAL
    // =========================

    /**
     * Adicionar caractere ao terminal
     */
    //% block="Terminal adicionar %car"
    export function terminalAdicionar(car: string) {

        if (car == "") return

        visor += car

        lcdMostrarTerminal()
    }

    /**
     * Limpar terminal
     */
    //% block="Terminal limpar"
    export function terminalLimpar() {

        visor = ""

        lcdMostrarTerminal()
    }

    /**
     * Obter terminal
     */
    //% block="Terminal obter texto"
    export function terminalTexto(): string {
        return visor
    }

    // =========================
    // COFRE
    // =========================

    /**
     * Definir senha
     */
    //% block="Cofre senha %senha"
    export function definirSenha(senha: string) {

        senhaCorreta = senha
        senhaDigitada = ""
    }

    /**
     * Processar cofre
     */
    //% block="Cofre processar tecla %tecla"
    export function processarCofre(tecla: string): string {

        if (tecla == "") return ""

        if (tecla == "*") {

            senhaDigitada = ""
            return "LIMPO"
        }

        if (tecla == "#") {

            if (senhaDigitada == senhaCorreta) {

                senhaDigitada = ""

                return "ACESSO LIBERADO"

            } else {

                senhaDigitada = ""

                return "SENHA INCORRETA"
            }
        }

        senhaDigitada += tecla

        let asteriscos = ""

        for (let i = 0; i < senhaDigitada.length; i++) {
            asteriscos += "*"
        }

        return asteriscos
    }

    // =========================
    // CALCULADORA
    // =========================

    let n1 = 0
    let n2 = 0
    let operacao = ""

    /**
     * Limpar calculadora
     */
    //% block="Calculadora limpar"
    export function calcLimpar() {

        n1 = 0
        n2 = 0
        operacao = ""

        visor = "0"
    }

    /**
     * Inserir tecla
     */
    //% block="Calculadora tecla %tecla"
    export function calcTecla(tecla: string) {

        if (tecla == "") return

        if (tecla == "*") {

            calcLimpar()
            lcdMostrarTerminal()
            return
        }

        if (tecla == "#") {

            let resultado = 0

            if (operacao == "+")
                resultado = n1 + n2

            else if (operacao == "-")
                resultado = n1 - n2

            else if (operacao == "*")
                resultado = n1 * n2

            else if (operacao == "/") {

                if (n2 == 0) {

                    visor = "ERRO"

                    lcdMostrarTerminal()

                    return
                }

                resultado = n1 / n2
            }

            visor = resultado.toString()

            lcdMostrarTerminal()

            n1 = resultado
            n2 = 0

            return
        }

        if (tecla == "A") {

            n1 = parseInt(visor)

            operacao = "+"

            visor += "+"

            lcdMostrarTerminal()

            return
        }

        if (tecla == "B") {

            n1 = parseInt(visor)

            operacao = "-"

            visor += "-"

            lcdMostrarTerminal()

            return
        }

        if (tecla == "C") {

            n1 = parseInt(visor)

            operacao = "*"

            visor += "*"

            lcdMostrarTerminal()

            return
        }

        if (tecla == "D") {

            n1 = parseInt(visor)

            operacao = "/"

            visor += "/"

            lcdMostrarTerminal()

            return
        }

        if (operacao == "") {

            if (visor == "0")
                visor = tecla
            else
                visor += tecla

        } else {

            let partes = visor.split(operacao)

            if (partes.length > 1) {

                partes[1] += tecla

                n2 = parseInt(partes[1])

                visor = partes[0] + operacao + partes[1]
            }
        }

        lcdMostrarTerminal()
    }
}