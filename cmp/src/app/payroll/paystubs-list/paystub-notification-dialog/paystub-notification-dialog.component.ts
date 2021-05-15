import { Component, Inject, ViewChild } from '@angular/core';
import { Agent } from '../../../models';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatListItem, MatSelectionList } from '@angular/material/list';

interface DialogData {
  agents: Agent[];
}

@Component({
  selector: 'cmp-paystub-notification-dialog',
  templateUrl: './paystub-notification-dialog.component.html',
  styleUrls: ['./paystub-notification-dialog.component.scss'],
})
export class PaystubNotificationDialogComponent {

  agents: Agent[] = [];
  isAllSelected = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private ref: MatDialogRef<PaystubNotificationDialogComponent>,
  ) {
    this.agents = this.data.agents;
  }

  confirmSend(confirmed: MatSelectionList) {
    const sendToAgents: Agent[] = confirmed.selectedOptions.selected.map(x => x.value);

    this.ref.close(sendToAgents);
  }

  cancel() {
    this.ref.close();
  }

  toggleSelectAll(list: MatSelectionList) {
    if (this.isAllSelected)
      list.deselectAll();
    else
      list.selectAll();

    this.isAllSelected = !this.isAllSelected;
  }

}
