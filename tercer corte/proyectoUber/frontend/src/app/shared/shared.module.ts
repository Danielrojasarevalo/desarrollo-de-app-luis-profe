import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';

import { AppFooterComponent } from './components/app-footer/app-footer.component';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { RouteMapComponent } from './components/route-map/route-map.component';
import { CopPipe, StarsPipe, StatusLabelPipe, StatusTonePipe } from './pipes/format.pipes';

// Piezas reutilizadas por las páginas de cliente, conductor y administrador.
@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [AppFooterComponent, AppHeaderComponent, RouteMapComponent, CopPipe, StarsPipe, StatusLabelPipe, StatusTonePipe],
  exports: [AppFooterComponent, AppHeaderComponent, RouteMapComponent, CopPipe, StarsPipe, StatusLabelPipe, StatusTonePipe],
})
export class SharedModule {}
