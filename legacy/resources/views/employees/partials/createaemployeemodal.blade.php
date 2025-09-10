<div class="modal fade" id="create-employee-modal">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header bg-primary" style="border-top-left-radius:6px;border-top-right-radius:6px;">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <div class="modal-title">
                    <h2>Add a New Employee</h2>
                </div>
            </div>

            <div class="modal-body">
                <div class="row">
                    <div class="col-xs-12">
                        <form id="add-employee-form">
                            <div class="form-group">
                                <label for="empName">Employee Name: </label>
                                <input type="text" class="form-control" id="emp_name" name="name" placeholder="Full Name" required>
                            </div>

                            <div class="form-group">
                                <label for="empEmail">Email: </label>
                                <input type="email" class="form-control" id="emp_email" name="email" placeholder="Email Address" required>
                            </div>

                            <div class="form-group">
                                <label for="empPhone">Phone No: </label>
                                <input type="number" class="form-control" id="emp_phone" name="phone_no" placeholder="Phone Number" required>
                            </div>

                            <div class="form-group">
                                <label for="empAddress">Address: </label>
                                <input type="text" class="form-control" id="emp_address" name="address" placeholder="Full Address" required>
                            </div>

                            <div class="form-group">
                                <label for="empSalesIdOne">Sales ID #1: </label>
                                <input type="text" class="form-control" id="sales_id1" name="sales_id1" placeholder="Sales ID One" />
                            </div>

                            <div class="form-group">
                                <label for="empSalesIdTwo">Sales ID #2: </label>
                                <input type="text" class="form-control" id="sales_id2" name="sales_id2" placeholder="Sales ID Two" />
                            </div>

                            <div class="form-group">
                                <label for="empSalesIdThree">Sales ID #3: </label>
                                <input type="text" class="form-control" id="sales_id3" name="sales_id3" placeholder="Sales ID Three" />
                            </div>

                            <div class="form-group">
                                <label for="is_mgr">Manager</label>
                                <input type="checkbox" class="form-control" id="is_mgr" name="is_mgr" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" data-action="save-new-employee"><i class="fa fa-save"></i> Save</button>
            </div>
        </div>
    </div>
</div>
