import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { DEFAULT_CENTER } from '../../../core/data/places';
import { Coordinates } from '../../../core/models/api.models';

/*
 * MAPA CON LEAFLET + OPENSTREETMAP
 * Recibe coordenadas por @Input y dibuja:
 *  - origin (verde) y destination (rojo) unidos por una línea = la ruta
 *  - driver (carro verde oscuro) = ubicación GPS del conductor
 *  - me (azul) = ubicación actual del usuario (botón "Usar mi ubicación")
 * Cada vez que cambia un @Input, ngOnChanges vuelve a pintar los marcadores.
 */
@Component({
  selector: 'app-route-map',
  template: '<div #mapEl class="map" [style.height.px]="height"></div>',
  styles: [`
    :host { display: block; }
    .map { width: 100%; border-radius: 16px; overflow: hidden; box-shadow: inset 0 0 0 2px #d1fae5; }
  `],
  standalone: false,
})
export class RouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() origin: Coordinates | null = null;
  @Input() destination: Coordinates | null = null;
  @Input() driver: Coordinates | null = null;
  @Input() me: Coordinates | null = null;
  @Input() height = 240;
  // Si es true, el mapa sigue al conductor en lugar de encuadrar toda la ruta.
  @Input() followDriver = false;

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layer = L.layerGroup();

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: true })
      .setView(toLatLng(DEFAULT_CENTER), 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.redraw();
    // Ionic anima la entrada de la página; cuando termina, Leaflet debe recalcular su tamaño.
    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  ngOnChanges(): void {
    this.redraw();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // Lo usa el botón "Centrar mapa en mi ubicación".
  centerOn(point: Coordinates, zoom = 16): void {
    this.map?.setView(toLatLng(point), zoom);
  }

  private redraw(): void {
    if (!this.map) {
      return;
    }
    this.layer.clearLayers();
    const points: L.LatLng[] = [];

    if (this.origin) {
      this.layer.addLayer(L.marker(toLatLng(this.origin), { icon: pin('origin', '📍') }).bindTooltip('Recogida'));
      points.push(toLatLng(this.origin));
    }
    if (this.destination) {
      this.layer.addLayer(L.marker(toLatLng(this.destination), { icon: pin('destination', '🏁') }).bindTooltip('Destino'));
      points.push(toLatLng(this.destination));
    }
    if (this.origin && this.destination) {
      this.layer.addLayer(L.polyline([toLatLng(this.origin), toLatLng(this.destination)], {
        color: '#059669',
        weight: 5,
        opacity: 0.85,
      }));
    }
    if (this.me) {
      this.layer.addLayer(L.marker(toLatLng(this.me), { icon: pin('me', '•') }).bindTooltip('Tú'));
      points.push(toLatLng(this.me));
    }
    if (this.driver) {
      this.layer.addLayer(L.marker(toLatLng(this.driver), { icon: pin('driver', '🚗') }).bindTooltip('Conductor'));
      points.push(toLatLng(this.driver));
    }

    if (this.followDriver && this.driver) {
      this.map.panTo(toLatLng(this.driver));
    } else if (points.length === 1) {
      this.map.setView(points[0], 15);
    } else if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
    }
  }
}

function toLatLng(c: Coordinates): L.LatLng {
  return L.latLng(c.latitude, c.longitude);
}

// Marcador circular hecho con HTML (clases .map-pin en global.scss).
function pin(kind: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${kind}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
