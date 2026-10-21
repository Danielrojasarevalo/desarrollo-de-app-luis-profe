import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { AppHeaderComponent } from './components/app-header/app-header.component';
import { RouteMapComponent } from './components/route-map/route-map.component';
import { CopPipe, StatusLabelPipe, StatusTonePipe } from './pipes/format.pipes';

// Piezas reutilizadas por las páginas de cliente, conductor y administrador.
@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [AppHeaderComponent, RouteMapComponent, CopPipe, StatusLabelPipe, StatusTonePipe],
  exports: [AppHeaderComponent, RouteMapComponent, CopPipe, StatusLabelPipe, StatusTonePipe],
})
export class SharedModule {}
