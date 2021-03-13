import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FourOhFourComponent } from '../four-oh-four/four-oh-four.component';



@NgModule({
  declarations: [FourOhFourComponent],
  imports: [
    CommonModule
  ],
  exports: [FourOhFourComponent],
})
export class ComponentsModule { }
