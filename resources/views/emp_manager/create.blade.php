@extends('layouts.app')

@section('content')

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="page-header">
                <h1>Employee Manager</h1>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <h2>Add a New Employee</h2>
        </div>
    </div>

    <div class="row">
        <div class="col-md-7 col-md-offset-1">
            {!! Form::open(['url' => 'employees', 'method' => 'POST']) !!}

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
                    <button type="submit" class="btn btn-primary">Submit</button>
                </div>

            {!! Form::close() !!}
        </div>
    </div>

@endsection

@section('scripts')

    <script type="text/javascript">
        $('#display_msgs').fadeOut(3000);
    </script>

@endsection