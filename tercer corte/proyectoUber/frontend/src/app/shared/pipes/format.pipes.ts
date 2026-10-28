import { Pipe, PipeTransform } from '@angular/core';

import { STATUS_LABELS, formatCop, starIcons, statusTone } from '../../core/utils/format';

// {{ 6500 | cop }} -> "$6.500 COP"
@Pipe({ name: 'cop', standalone: false })
export class CopPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCop(value);
  }
}

// {{ 'in_progress' | statusLabel }} -> "En viaje"
@Pipe({ name: 'statusLabel', standalone: false })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? STATUS_LABELS[value] ?? value : '—';
  }
}

// [class]="status | statusTone" -> "warn" | "bad" | "info" | ""
@Pipe({ name: 'statusTone', standalone: false })
export class StatusTonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return statusTone(value ?? undefined);
  }
}

// @for (icon of 4.5 | stars; ...) -> 5 íconos: llenas, media y vacías
@Pipe({ name: 'stars', standalone: false })
export class StarsPipe implements PipeTransform {
  transform(value: number | null | undefined): string[] {
    return starIcons(value);
  }
}
