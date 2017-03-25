{{-- this is the top menu navigation --}}
<div class="w-650">
    <div class="row">
        <div class="col-xs-12">
            <ul class="list-inline">
                <li>
                    <a href="{{action('DocumentController@index')}}" class="btn btn-primary"><i class="ion ion-android-attach"></i> Documents</a>
                </li>
                @if($admin->contains('name', $currentUser->name))
                <li>
                    <a href="{{action('EmpManagerController@index')}}" class="btn btn-primary"><i class="ion ion-android-contacts"></i> Employees</a>
                </li>
                <li>
                    <a href="/upload-invoice" class="btn btn-primary"><i class="ion ion-android-document"></i> Invoices</a>
                </li>
                <li>
                    <a href="/dashboards/dashboard" class="btn btn-primary"><i class="ion ion-settings"></i> Admin</a>
                </li>
                @endif
                <li>
                    <a href="/historical-invoice-data" class="btn btn-primary"><i class="ion ion-social-usd"></i> Paystubs</a>
                </li>
                {{--will implement after testing--}}
                {{--<li>--}}
                    {{--<a href="/payroll-dispute" class="btn btn-primary"><i class="ion ion-edit"></i> Dispute</a>--}}
                {{--</li>--}}
            </ul>
        </div>
    </div>
</div>