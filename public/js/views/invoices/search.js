var token = '{{csrf_token()}}';

// listen to event on employee name change
$('#employeeName').on('change', function(){ returnInvoiceSearchResults(token); });
$('#invoiceDates').on('change', function(){ returnInvoiceSearchResults(token); });
$('#campaignName').on('change', function(){ returnInvoiceSearchResults(token); });
//# sourceMappingURL=search.js.map
