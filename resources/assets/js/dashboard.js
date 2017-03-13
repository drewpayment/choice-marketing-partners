/**
 * Created by drewpayment on 3/12/17.
 * Dashboard view for Admin users
 */


// build sales by week highchart on page load
$(document).ready(function(){

    var a = JSON.parse($('#salesByWeek').find('.jsdata').text()),
        xAxis = [],
        series1 = [],
        series2 = [],
        series3 = [],
        series4 = [], d;

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
            formatter: function () {
                return '<b>' + this.series.name + '</b><br/>' +
                    this.x + ': ' + this.y;
            }
        },
        series: [{
            name: "Accepted",
            data: series1,
            color: '#19b73e'
        }, {
            name: "Rejected",
            data: series2,
            color: '#9e9e9e'
        }, {
            name: 'Chargebacks',
            data: series3,
            color: '#f20707'
        }, {
            name: 'Uncategorized',
            data: series4,
            color: '#8c6b6b'
        }]
    };

    $('#salesByWeek').highcharts(options);

});


