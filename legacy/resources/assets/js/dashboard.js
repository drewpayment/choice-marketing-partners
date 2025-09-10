/**
 * Created by drewpayment on 3/12/17.
 * Dashboard view for Admin users
 */


// build sales by week highchart on page load
$(document).ready(function(){
    if(!$('#salesByWeek').length) return false;
    var a = JSON.parse($('#salesByWeek').find('.jsdata').text()),
        xAxis = [],
        series1 = [],
        series2 = [],
        series3 = [],
        series4 = [], d,
        visibility = [];

    for(var i = 0; i < a.xAxis.length; i++){
        d = a.xAxis[i];
        var item = moment(d.issue_date, 'YYYY-M-D').format('MMM Do').toString();
        xAxis.push(item);
    }

    // accepted sales
    for(var i = 0; i < a.xAxis.length; i++){
        var acc = (a.accepted == undefined) ? 0 : a.accepted[i],
            rej =(a.rejected == undefined) ? 0 : a.rejected[i],
            chg = (a.chargebacks == undefined) ? 0 : a.chargebacks[i],
            unc = (a.uncategorized == undefined) ? 0 : a.uncategorized[i];

        if(acc == null || acc == undefined){
            series1.push(null);
        } else {
            series1.push(acc.saleCount);
        }

        if(rej == null || rej == undefined){
            series2.push(null);
        } else {
            series2.push(rej.saleCount);
        }

        if(chg == null || chg == undefined){
            series3.push(null);
        } else {
            series3.push(chg.saleCount);
        }

        if(unc == null || unc == undefined){
            series4.push(null);
        } else {
            series4.push(unc.saleCount);
        }
    }

    // this figures out if the series has all empty points in it,
    // and if it does, sets the series' visibility to default to false on the graph
    var allSeries = [series1, series2, series3, series4];
    for(var i = 0; i < 4; i++){
        visibility[i] = (allSeries[i].every(isUndefined)) ? false : true;
    }

    var options = {
        chart: {
            type: 'column'
        },
        credits: {
            enabled: false
        },
        title: {
            text: null
        },
        xAxis: {
            categories: xAxis
        },
        yAxis: {
            title: {
                text: null
            }
        },
        plotOptions: {
            stacking: 'normal'
        },
        tooltip: {
            borderColor: '#000000',
            formatter: function () {
                var s = '<b>'+this.x+'</b>';
                $.each(this.points, function(i, point){
                    s += '<br/><h3 class="bold" style="color:'+point.series.color+';">'+point.series.name+': '+point.y+'</h3>';
                });
                return s;
            },
            shared: true
        },
        series: [{
            name: "Accepted",
            data: series1,
            color: '#19b73e',
            visible: visibility[0]
        }, {
            name: "Rejected",
            data: series2,
            color: '#9e9e9e',
            visible: visibility[1]
        }, {
            name: 'Chargebacks',
            data: series3,
            color: '#f20707',
            visible: visibility[2]
        }, {
            name: 'Uncategorized',
            data: series4,
            color: '#8c6b6b',
            visible: visibility[3]
        }]
    };

    $('#salesByWeek').highcharts(options);

});


var isUndefined = function(elem){
    return elem == undefined;
};


function handlePaidConfirmClick(data){
    var payrollId = data.parentid;
    var isPaid = data.value;
    token = $('#global-token').attr('content');

    isPaid = (isPaid) ? 1 : 0;

    $.ajax({
        url: 'handlePayrollClick',
        type: 'POST',
        dataType: 'json',
        data: {
            payId: payrollId,
            isPaid: isPaid,
            _token: token
        },
        success: afterData
    });

    function afterData(data){
        if(data){
            setMessageContainer("Success!");
        }
    }
}


function refreshPayrollInfoTable(data){
    var date = data.value;
    token = (token) ? token : $('#global-token').attr('content');

    date = moment(date, 'MM-DD-YYYY');
    date = date.format('YYYY-MM-DD').toString();

    $.ajax({
        url: 'refreshPayrollInfo',
        type: 'GET',
        dataType: 'html',
        data: {
            date: date
        },
        success: afterData
    });

    function afterData(data){
        if(data){
            $('#TABLE_ROWDATA').html(data);
        }
    }
}