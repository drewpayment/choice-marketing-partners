import { Pipe, PipeTransform } from '@angular/core';



@Pipe({
  name: 'phone',
})
export class PhonePipe implements PipeTransform {

  transform(value: string, ...args: any[]) {
    const unformatted = value.replace(/\D/g,'');
    if (unformatted.length < 10) return value;

    const npa = unformatted.slice(0, 3);
    const nxx = unformatted.slice(3, 6);
    const last = unformatted.slice(6);

    return `(${npa}) ${nxx}-${last}`;
  }


}
