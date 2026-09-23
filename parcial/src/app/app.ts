import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Producto {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Guarda la pantalla que se muestra: catalogo, detalle, carrito o compra final.
  vista = signal('catalogo');
  productos = signal<Producto[]>([]);
  productoSeleccionado = signal<Producto | null>(null);
  carrito = signal<Producto[]>([]);
  categoria = signal('Todas');
  cargando = signal(true);

  constructor(private http: HttpClient) {}

  // Carga los productos desde la API cuando inicia la aplicacion.
  ngOnInit(): void {
    this.http.get<Producto[]>('https://fakestoreapi.com/products').subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  // Filtra los productos segun la categoria elegida en el selector.
  productosFiltrados(): Producto[] {
    return this.categoria() === 'Todas'
      ? this.productos()
      : this.productos().filter((producto) => producto.category === this.categoria());
  }

  // Devuelve las categorias sin repetir para llenar el selector.
  categorias(): string[] {
    return ['Todas', ...new Set(this.productos().map((producto) => producto.category))];
  }

  // Traduce las categorias de la API para mostrarlas en español.
  nombreCategoria(categoria: string): string {
    const traducciones: Record<string, string> = {
      Todas: 'Todas',
      electronics: 'Electronica',
      jewelery: 'Joyería',
      "men's clothing": 'Ropa de hombre',
      "women's clothing": 'Ropa de mujer'
    };

    return traducciones[categoria] ?? categoria;
  }

  // Abre la vista de detalle de un producto.
  verProducto(producto: Producto): void {
    this.productoSeleccionado.set(producto);
    this.vista.set('detalle');
  }

  // Agrega el producto seleccionado al carrito y lo muestra.
  agregarAlCarrito(producto: Producto): void {
    this.carrito.update((carrito) => [...carrito, producto]);
    this.vista.set('carrito');
  }

  // Quita una unidad del carrito usando la posicion del producto.
  quitarDelCarrito(posicion: number): void {
    this.carrito.update((carrito) => carrito.filter((_, indice) => indice !== posicion));
  }

  // Calcula el valor total de los productos agregados.
  total(): number {
    return this.carrito().reduce((total, producto) => total + producto.price, 0);
  }

  // Regresa al catalogo para continuar comprando.
  seguirComprando(): void {
    this.vista.set('catalogo');
  }

  // Cierra la vista actual y regresa a la pantalla principal.
  cerrarVista(): void {
    this.seguirComprando();
  }

  // Simula el envio del pedido y limpia el carrito.
  finalizarCompra(): void {
    alert('Compra realizada correctamente. Gracias por comprar.');
    this.carrito.set([]);
    this.vista.set('catalogo');
  }
}
