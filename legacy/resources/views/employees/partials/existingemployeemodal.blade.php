<div class="modal-dialog" role="document">
	<div class="modal-content">
		<div class="modal-header bg-primary">
			<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span></button>
			<h4 class="modal-title">Edit Employee</h4>
		</div>
		<div class="modal-body">
			<form id="emp_id" data-parentid="{{$emp->id}}">
				<div class="form-group">
					<label for="emp_name">Name</label>
					<input type="text" class="form-control" id="emp_name" name="emp_name" value="{{ $emp->name }}" placeholder="Employee Name">
				</div>
				<div class="form-group">
					<label for="emp_email">Email</label>
					<input type="email" class="form-control" id="emp_email" name="emp_email" value="{{ $emp->email }}" placeholder="Email">
				</div>
				<div class="form-group">
					<label for="emp_phone">Phone Number</label>
					<input type="text" class="form-control" id="emp_phone" name="emp_phone" value="{{ $emp->phone_no }}" placeholder="Phone Number">
				</div>
				<div class="form-group">
					<label for="is_mgr">Manager</label>
					<input type="checkbox" class="form-control" id="is_mgr" name="is_mgr" @if($emp->is_mgr == 1) checked @endif @if($emp->id == 1) disabled @endif />
				</div>
				<div class="form-group">
					<label for="emp_address">Address</label>
					<input type="text" class="form-control" id="emp_address" name="emp_address" value="{{ $emp->address }}">
				</div>
				<div class="form-group">
					<label for="empSalesIdOne">Sales ID #1: </label>
					<input type="text" class="form-control" id="sales_id1" name="sales_id1" value="{{ $emp->sales_id1 }}" placeholder="Sales ID One" />
				</div>

				<div class="form-group">
					<label for="empSalesIdTwo">Sales ID #2: </label>
					<input type="text" class="form-control" id="sales_id2" name="sales_id2" value="{{ $emp->sales_id2 }}" placeholder="Sales ID Two" />
				</div>

				<div class="form-group">
					<label for="empSalesIdThree">Sales ID #3: </label>
					<input type="text" class="form-control" id="sales_id3" name="sales_id3" value="{{ $emp->sales_id3 }}" placeholder="Sales ID Three" />
				</div>
			</form>
		</div>
		<div class="modal-footer">
			<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
			<button type="button" class="btn btn-primary" data-action="save-employee-changes">
                <i class="fa fa-save"></i> Save
            </button>
		</div>
	</div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->