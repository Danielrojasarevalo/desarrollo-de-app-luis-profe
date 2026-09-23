import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {

  currentDate = '';
  isProfileModalOpen = false;

  showDate(): void {
    this.currentDate = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());
  }
  openProfile(): void {
    this.isProfileModalOpen = true;
  }
}
