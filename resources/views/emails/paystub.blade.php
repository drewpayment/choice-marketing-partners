
<head>
    <style>
        @media screen {
            @font-face {
                font-family: 'Lato';
                font-style: normal;
                font-weight: 400;
                src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
            }

            body {
                font-family: "Lato", "Lucida Grande", "Lucida Sans Unicode", Tahoma, Sans-Serif;
            }
        }
    </style>
</head>
<body>
    <table style="width: 440px;">
        <tbody>
        <tr>
            <table style="width: 1000%;">
                <tbody>
                <tr>
                    <td>
                        <div style="margin: 0 10px 10px 0;">
                            Hi {{ $paystub->agent_name }}, just dropping in to let you know that you have a new paystub available.
                        </div>

                        <div style="margin: 0 0 5px 0;">
                            Issued: @datetime($paystub->issue_date)
                        </div>

                        <div style="margin: 0 0 5px 0;">
                            Vendor: {{ $paystub->vendor_name }}
                        </div>

                        <div style="margin: 0 0 5px 0;">
                            Total: $ @currency($paystub->amount)
                        </div>

                        <div style="margin: 10px 0 10px 0;">
                            <a href='{{ \Illuminate\Support\Facades\URL::to("/payroll/employees/{$paystub->agent_id}/paystubs/{$paystub->id}") }}'>
                                View paystub here
                            </a>
                        </div>
                    </td>
                </tr>
                </tbody>
            </table>
        </tr>
        </tbody>
    </table>
</body>

