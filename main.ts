/**
 * Lista de endereços I2C comuns para selecionar no bloco
 */
enum LcdAddress {
    //% block="0x27 (Padrão)"
    Addr27 = 0x27,
    //% block="0x3F (Alternativo)"
    Addr3F = 0x3F,
    //% block="0x20"
    Addr20 = 0x20,
    //% block="0x38"
    Addr38 = 0x38
}

/**
 * Enum para mapear visualmente as 32 posições do LCD 16x2
 */
enum LcdPosition1602 {
    P1 = 0, P2 = 1, P3 = 2, P4 = 3, P5 = 4, P6 = 5, P7 = 6, P8 = 7, P9 = 8, P10 = 9, P11 = 10, P12 = 11, P13 = 12, P14 = 13, P15 = 14, P16 = 15,
    P17 = 16, P18 = 17, P19 = 18, P20 = 19, P21 = 20, P22 = 21, P23 = 22, P24 = 23, P25 = 24, P26 = 25, P27 = 26, P28 = 27, P29 = 28, P30 = 29, P31 = 30, P32 = 31
}

//% weight=100 color=#0066cc icon="\uf11c" block="Aplicativos"
namespace superKitI2C {

    let senhaCorreta = "1234"
    let senhaDigitada = ""
    let lcdAddr = 0x27
    let backlightState = 0x08

    // Variáveis da Calculadora
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

    function i2cLcdWrite(data: number, mode: number) {
        let highnib = data & 0xf0
        let lownib = (data << 4) & 0xf0
        pins.i2cWriteNumber(lcdAddr, highnib | mode | backlightState | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, highnib | mode | backlightState, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | backlightState | 0x04, NumberFormat.Int8LE)
        pins.i2cWriteNumber(lcdAddr, lownib | mode | backlightState, NumberFormat.Int8LE)
    }

    /**
     * Inicializa a tela LCD I2C selecionando o endereço na lista.
     */
    //% block="[LCD] Inicializar no endereço %addr"
    export function lcdInit(addr: LcdAddress): void {
        lcdAddr = addr // O valor selecionado no menu cai aqui
        basic.pause(50)
        i2cLcdWrite(0x33, 0)
        basic.pause(5)
        i2cLcdWrite(0x32, 0)
        i2cLcdWrite(0x28, 0)
        i2cLcdWrite(0x0C, 0)
        i2cLcdWrite(0x06, 0)
        i2cLcdWrite(0x01, 0)
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

    // --- ABAIXO CONTINUA O RESTANTE DO SEU CÓDIGO (Backlight, Símbolos, Teclado, etc.) ---

    /**
     * Liga ou desliga a luz de fundo (backlight) do LCD
     */
    //% block="[LCD] Luz de fundo %on"
    //% on.shadow="toggleOnOff"
    export function lcdBacklight(on: boolean): void {
        backlightState = on ? 0x08 : 0x00;
        i2cLcdWrite(0x00, 0);
    }

    //% blockId=superkit_lcd_position_1602
    //% block="%pos"
    //% pos.fieldEditor="gridpicker"
    //% pos.fieldOptions.columns=16
    //% blockHidden=true
    export function position1602(pos: LcdPosition1602): number {
        return pos;
    }

    /**
     * Exibe um símbolo customizado (Slot 0 a 7) na posição do Grid
     */
    //% block="[LCD Símbolo] Mostrar Slot %slot|na posição %position=superkit_lcd_position_1602"
    //% slot.min=0 slot.max=7
    export function lcdShowCharacter1602(slot: number, position: number): void {
        let col = position % 16;
        let linha = position >= 16 ? 1 : 0;
        let offsets = [0x00, 0x40];
        i2cLcdWrite(0x80 | (offsets[linha] + col), 0);
        i2cLcdWrite(slot, 1);
    }

    /**
     * Cria um caractere customizado inserindo os valores binários (0bXXXXX)
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
     * Exibe um texto normal no LCD
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
     * Lê qual tecla foi pressionada no teclado 4x4 via expansor PCF8574
     */
    //% block="[Teclado] Ler tecla no endereço I2C %addr"
    export function lerTeclado(addr: LcdAddress): string {
        // Usamos o mesmo Enum de endereços para facilitar
        for (let l = 0; l < 4; l++) {
            let mascara = 0xFF & ~(1 << l);
            pins.i2cWriteNumber(addr, mascara, NumberFormat.Int8LE);
            let leitura = pins.i2cReadNumber(addr, NumberFormat.Int8LE);
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

    // --- CONTINUA COM AS FUNÇÕES DE COFRE E CALCULADORA ---
    // (As funções processarCofre, gerarTextoScroll, calcInserirDigito, etc., permanecem iguais)
}