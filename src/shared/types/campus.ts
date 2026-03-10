/**
 * Tipo y constantes de sede (campus) — definición única para toda la app.
 */
export type Campus = 'Monterrico' | 'San Miguel';

export const CAMPUS_OPTIONS: Campus[] = ['Monterrico', 'San Miguel'];

export const getCampusFromParam = (value: string | null): Campus =>
  value === 'San Miguel' ? 'San Miguel' : 'Monterrico';
