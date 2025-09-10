<div class="row pt-20">
    <div class="col-xs-12">
        <ul class="list-inline list-unstyled">
            <li>
                <h3>{{$employee->name}} <small>{{$campaign}}</small></h3>
            </li>
            <li>
                <h4>Issued: {{date('F jS, Y', $invoice->issue_date)}}</h4>
            </li>
            <li>
                <h4>Weekending: {{date('m-d-Y', $invoice->wkending)}}</h4>
            </li>
        </ul>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div id="invoiceTable"></div>
    </div>
</div>
<div class="row pt-10">
    <div class="col-xs-12">
        <ul class="list-inline">
            <li>
                <h2>Overrides <small>Enter any applicable overrides.</small></h2>
                <br>
                <div id="overridesTable" class="overridesTable" data-parent="true"></div>
            </li>
            <li>
                <h2>Expenses <small>Enter any applicable expenses.</small></h2>
                <br>
                <div id="expensesTable" class="overridesTable" data-parent="true"></div>
            </li>
        </ul>
        <div class="pull-right pr-60">
            <ul class="list-inline">
                <li>
                    <button class="btn btn-primary" data-tag="1" data-vero="button">Submit</button>
                </li>
                <li>
                    <button class="btn btn-default" data-vero="button">Cancel</button>
                </li>
            </ul>
        </div>
    </div>
</div>