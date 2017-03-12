/**
 * Created by drewpayment on 3/12/17.
 * Dashboard view for Admin users
 */


// build sales by week highchart on page load
$(document).ready(function(){

    var a = JSON.parse($('#salesByWeek').find('.jsdata').text()),
        xAxis = [],
        series1 = [], d;

    for(var i = 0; i < a.xAxis.length; i++){
        d = a.xAxis[i];
        var item = moment(d.issue_date, 'YYYY-M-D').format('MMM Do').toString();
        xAxis.push(item);
    }

    for(var i = 0; i < a.y1.length; i++){
        d = a.y1[i];
        series1.push(d.saleCount);
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
        tooltip: {
            formatter: function () {
                return '<b>' + this.series.name + '</b><br/>' +
                    this.x + ': ' + this.y;
            }
        },
        series: [{
            name: "Sales",
            data: series1
        }]
    };

    $('#salesByWeek').highcharts(options);

});


