import { Component, computed, input, output, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de paginación reusable.
 * Uso:
 *   <app-pagination
 *     [totalItems]="lista.length"
 *     [pageSize]="7"
 *     [currentPage]="page()"
 *     (pageChange)="page.set($event)" />
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="totalItems() > 0"
         class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white text-sm text-gray-600 rounded-b-2xl">
      <div>
        Mostrando
        <span class="font-semibold text-gray-800">{{ rangeFrom() }}</span>
        –
        <span class="font-semibold text-gray-800">{{ rangeTo() }}</span>
        de
        <span class="font-semibold text-gray-800">{{ totalItems() }}</span>
      </div>

      <div class="flex items-center gap-1">
        <button (click)="go(1)" [disabled]="currentPage() === 1"
                class="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Primera">«</button>
        <button (click)="go(currentPage() - 1)" [disabled]="currentPage() === 1"
                class="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Anterior">‹</button>

        <button *ngFor="let p of pageNumbers()"
                (click)="go(p)"
                [class]="p === currentPage()
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-blue-50 text-gray-700'"
                class="min-w-[32px] h-8 px-2 rounded font-semibold text-xs">
          {{ p }}
        </button>

        <button (click)="go(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                class="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Siguiente">›</button>
        <button (click)="go(totalPages())" [disabled]="currentPage() === totalPages()"
                class="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Última">»</button>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  totalItems   = input.required<number>();
  pageSize     = input<number>(7);
  currentPage  = input<number>(1);
  pageChange   = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  rangeFrom  = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  rangeTo    = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()));
  pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const window = 5;
    let start = Math.max(1, cur - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    if (end - start + 1 < window) start = Math.max(1, end - window + 1);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  go(page: number) {
    const p = Math.min(Math.max(1, page), this.totalPages());
    if (p !== this.currentPage()) this.pageChange.emit(p);
  }
}

/**
 * Helper: devuelve un slice paginado de un array.
 * Útil para usar dentro de un computed() sin tener que repetir lógica.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
