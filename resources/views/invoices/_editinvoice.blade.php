
@if(is_null($employee) || is_null($campaign) || is_null($invoiceDate) || is_null($weekEnding))
<!-- what do i do if there are no records? need to move this to controller to handle -->
@else
<div class="row pt-20">
    <div class="col-xs-12">
        <ul class="list-inline list-unstyled">
            <li>
                <h3 id="employee" data-id="{{$employee->id}}">{{$employee->name}} <small id="vendor" data-vendor="{{$campaign->id}}">{{$campaign->name}}</small></h3>
            </li>
            <li>
                <h4 id="issueDate" data-date="{{$invoiceDate}}">Issued: {{$issueDate}}</h4>
            </li>
            <li>
                <h4 id="wkendDate" data-weekending="{{$weekEnding}}">Weekending: {{date_format(date_create($weekEnding), "F jS, Y")}}</h4>
            </li>
        </ul>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div id="invoiceTable">
            <div class="jsdata">{{$invoices}}</div>
        </div>
    </div>
</div>
<div class="row pt-10">
    <div class="col-xs-12">
        <ul class="list-inline">
            <li>
                <h2>Overrides <small>Enter any applicable overrides.</small></h2>
                <br>
                <div id="overridesTable" class="overridesTable" data-parent="true">
                    <div class="jsdata">{{$overrides}}</div>
                </div>
            </li>
            <li>
                <h2>Expenses <small>Enter any applicable expenses.</small></h2>
                <br>
                <div id="expensesTable" class="overridesTable" data-parent="true">
                    <div class="jsdata">{{$expenses}}</div>
                </div>
            </li>
        </ul>
        <div class="pull-right pr-60">
            <ul class="list-inline">
                <li>
                    <button class="btn btn-primary" id="saveInvoiceChanges">Submit</button>
                </li>
            </ul>
        </div>
    </div>
</div>
@endif