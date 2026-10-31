import { createCat } from '@/services/cats';

export function makeCat(name = 'Testy', extras: Parameters<typeof createCat>[1] = {}) {
  return createCat({ name, sex: 'female', neuterStatus: 'neutered', birthDate: '2020-05-01' }, extras);
}
