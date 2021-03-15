import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FourOhFourComponent } from '../four-oh-four/four-oh-four.component';
import { NbCardModule } from '@nebular/theme';



@NgModule({
  declarations: [FourOhFourComponent],
  imports: [
    CommonModule,
    NbCardModule,
  ],
  exports: [FourOhFourComponent],
})
export class ComponentsModule { }
