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
                        {!! Form::open(['url' => 'agents', 'method' => 'POST', 'id' => 'ADD_EMPLOYEE_FORM']) !!}

                        <div class="form-group">
                            <label for="empName">Employee Name: </label>
                            <input type="text" class="form-control" id="empName" name="name" placeholder="Full Name" required>
                        </div>

                        <div class="form-group">
                            <label for="empEmail">Email: </label>
                            <input type="email" class="form-control" id="empEmail" name="email" placeholder="Email Address" required>
                        </div>

                        <div class="form-group">
                            <label for="empPhone">Phone No: </label>
                            <input type="number" class="form-control" id="empPhone" name="phone_no" placeholder="Phone Number" required>
                        </div>

                        <div class="form-group">
                            <label for="empAddress">Address: </label>
                            <input type="text" class="form-control" id="empAddress" name="address" placeholder="Full Address" required>
                        </div>

                        <div class="form-group">
                            <label for="empSalesIdOne">Sales ID #1: </label>
                            <input type="text" class="form-control" id="empSalesIdOne" name="sales_id1" placeholder="Sales ID One" />
                        </div>

                        <div class="form-group">
                            <label for="empSalesIdTwo">Sales ID #2: </label>
                            <input type="text" class="form-control" id="empSalesIdTwo" name="sales_id2" placeholder="Sales ID Two" />
                        </div>

                        <div class="form-group">
                            <label for="empSalesIdThree">Sales ID #3: </label>
                            <input type="text" class="form-control" id="empSalesIdThree" name="sales_id3" placeholder="Sales ID Three" />
                        </div>

                        <input type="submit" id="form-submit" class="hidden">

                        {!! Form::close() !!}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <label for="ADD_EMPLOYEE_FORM" role="button" class="btn btn-primary" data-tag="6" data-vero="button">Submit</label>
            </div>
        </div>
    </div>
</div>
