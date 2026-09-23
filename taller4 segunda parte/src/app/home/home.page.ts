import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  display = '0';
  expression = '0';
  firstValue: number | null = null;
  operator: string | null = null;
  waitingForSecondValue = false;
  memoryValue = 0;

  appendDigit(value: string): void {
    if (this.waitingForSecondValue) {
      this.display = value;
      this.expression = value;
      this.waitingForSecondValue = false;
      return;
    }

    if (this.display === '0' && value !== '.') {
      this.display = value;
    } else {
      this.display += value;
    }

    this.expression = this.display;
  }

  appendDecimal(): void {
    if (this.waitingForSecondValue) {
      this.display = '0.';
      this.expression = '0.';
      this.waitingForSecondValue = false;
      return;
    }

    if (this.display.includes('.')) {
      return;
    }

    this.display += '.';
    this.expression = this.display;
  }

  selectOperator(op: string): void {
    const currentValue = Number(this.display);

    if (this.operator && this.waitingForSecondValue) {
      this.operator = op;
      this.expression = `${this.firstValue ?? 0} ${op}`;
      return;
    }

    if (this.firstValue === null) {
      this.firstValue = currentValue;
    } else if (this.operator) {
      const result = this.calculate(this.firstValue, currentValue, this.operator);
      this.display = String(result);
      this.firstValue = result;
    }

    this.operator = op;
    this.waitingForSecondValue = true;
    this.expression = `${this.firstValue} ${op}`;
  }

  calculate(first: number, second: number, op: string): number {
    switch (op) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        return second === 0 ? NaN : first / second;
      default:
        return second;
    }
  }

  equals(): void {
    if (this.operator === null || this.firstValue === null) {
      return;
    }

    const secondValue = Number(this.display);
    const result = this.calculate(this.firstValue, secondValue, this.operator);

    this.expression = `${this.firstValue} ${this.operator} ${secondValue} =`;
    this.display = Number.isFinite(result) ? String(result) : 'Error';
    this.firstValue = null;
    this.operator = null;
    this.waitingForSecondValue = false;
  }

  clearAll(): void {
    this.display = '0';
    this.expression = '0';
    this.firstValue = null;
    this.operator = null;
    this.waitingForSecondValue = false;
  }

  deleteLast(): void {
    if (this.waitingForSecondValue) {
      return;
    }

    if (this.display.length <= 1) {
      this.display = '0';
    } else {
      this.display = this.display.slice(0, -1);
    }

    this.expression = this.display;
  }

  toggleSign(): void {
    this.display = String(Number(this.display) * -1);
    this.expression = this.display;
  }

  percentage(): void {
    const value = Number(this.display) / 100;
    this.display = String(value);
    this.expression = this.display;
  }

  square(): void {
    const value = Number(this.display) ** 2;
    this.display = String(value);
    this.expression = `${this.display}²`;
  }

  squareRoot(): void {
    const value = Math.sqrt(Number(this.display));
    this.display = String(value);
    this.expression = `√${this.display}`;
  }

  addPi(): void {
    const value = Number(this.display) * Math.PI;
    this.display = String(value);
    this.expression = `${this.display}π`;
  }

  memoryClear(): void {
    this.memoryValue = 0;
  }

  memoryRecall(): void {
    this.display = String(this.memoryValue);
    this.expression = 'M';
  }

  memorySave(): void {
    this.memoryValue = Number(this.display);
  }

  memoryAdd(): void {
    this.memoryValue += Number(this.display);
  }

  downloadApplication(): void {
    const application = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Calculadora Ionic</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #07111d; color: #edf6ff; }
    main { width: min(92vw, 360px); padding: 24px; border: 1px solid #276da8; border-radius: 24px; background: #0d1a2a; box-shadow: 0 20px 40px #0008; }
    h1 { margin-top: 0; font-size: 1.5rem; } .screen { padding: 18px; margin: 16px 0; border-radius: 14px; background: #071019; text-align: right; }
    #result { min-height: 42px; font-size: 2.4rem; overflow-wrap: anywhere; } .keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    button { min-height: 54px; border: 0; border-radius: 12px; background: #173452; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; } button.operator { background: #126fd0; }
  </style>
</head>
<body><main><h1>Calculadora Ionic</h1><div class="screen"><div id="result">0</div></div><div class="keys">
  <button onclick="clearDisplay()">C</button><button onclick="backspace()">DEL</button><button onclick="append('%')">%</button><button class="operator" onclick="append('/')">÷</button>
  <button onclick="append('7')">7</button><button onclick="append('8')">8</button><button onclick="append('9')">9</button><button class="operator" onclick="append('*')">×</button>
  <button onclick="append('4')">4</button><button onclick="append('5')">5</button><button onclick="append('6')">6</button><button class="operator" onclick="append('-')">−</button>
  <button onclick="append('1')">1</button><button onclick="append('2')">2</button><button onclick="append('3')">3</button><button class="operator" onclick="append('+')">+</button>
  <button onclick="append('0')">0</button><button onclick="append('.')">.</button><button class="operator" style="grid-column: span 2" onclick="calculate()">=</button>
</div></main><script>
  const result = document.querySelector('#result'); let value = '';
  function append(item) { value += item; result.textContent = value || '0'; }
  function clearDisplay() { value = ''; result.textContent = '0'; }
  function backspace() { value = value.slice(0, -1); result.textContent = value || '0'; }
  function calculate() { try { value = String(Function('return ' + value.replace('%', '/100'))()); result.textContent = value; } catch { value = ''; result.textContent = 'Error'; } }
</script></body></html>`;

    const file = new Blob([application], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calculadora-ionic.html';
    link.click();
    URL.revokeObjectURL(url);
  }
}
