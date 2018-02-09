$(document).ready(function() {
    var overrideTblElem = $('#overridesTable'),
            expenseTblElem = $('#expensesTable'),
            invoiceData = JSON.parse($('#invoiceTable').text()),
            overrideData = JSON.parse(overrideTblElem.text()),
            expenseData = JSON.parse(expenseTblElem.text());

        var overrides = (overrideTblElem.data('length') > 2),
            expenses = (expenseTblElem.data('length') > 2);

        var overrideBtn = $('#addOverrides').find('i');

        var overrideBtnIcon = (overrides) ? 'fa-minus' : 'fa-plus';
        var overrideBtnIconInverse = (overrides) ? 'fa-plus' : 'fa-minus';
        overrideBtn.addClass(overrideBtnIcon);

        var expenseBtn = $('#addExpenses').find('i'),
            expenseBtnIcon = (expenses) ? 'fa-minus' : 'fa-plus',
            expenseBtnIconInverse = (expenses) ? 'fa-plus' : 'fa-minus';
        expenseBtn.addClass(expenseBtnIcon);

        if(!overrides) $('#overrides').css('display', 'none');
        if(!expenses) $('#expenses').css('display', 'none');



        $(function(){
            var saveBtn = $('#saveInvoice');

            $(document).on('click', '#addOverrides', function(){
                var el = $(this),
                    $ovr = $('#overrides');
                if(el.find('i').hasClass(overrideBtnIcon)){
                    el.find('i').removeClass(overrideBtnIcon).addClass(overrideBtnIconInverse);
                    overrides = true;
                } else {
                    el.find('i').removeClass(overrideBtnIconInverse).addClass(overrideBtnIcon);
                    overrides = false;
                }

                if(expenses){
                    $ovr.fadeToggle({
                        done: function(){
                            overHot.render();
                        }
                    });
                } else {
                    saveBtn.fadeToggle({
                        done: function(){
                            $ovr.fadeToggle({
                                done: function(){
                                    saveBtn.fadeToggle();
                                    overHot.render();
                                }
                            });
                        }
                    });
                }


            });

            $(document).on('click', '#addExpenses', function(){
                var el = $(this),
                    $exp = $('#expenses');

                if(el.find('i').hasClass(expenseBtnIcon)){
                    el.find('i').removeClass(expenseBtnIcon).addClass(expenseBtnIconInverse);
                    expenses = true;
                } else {
                    el.find('i').removeClass(expenseBtnIconInverse).addClass(expenseBtnIcon);
                    expenses = false;
                }

                if(overrides){
                    $exp.fadeToggle({
                        done: function(){
                            expHot.render();
                        }
                    });
                } else {
                    saveBtn.fadeToggle({
                        done: function(){
                            $exp.fadeToggle({
                                done: function(){
                                    saveBtn.fadeToggle();
                                    expHot.render();
                                }
                            });
                        }
                    });
                }

            });
        });

        $(document).on('click', 'button', handleClick);

        var formValid = {
            status: true,
            saleDate: true
        }
        var lengthValidator = function(value, callback) {
            setTimeout(function() {
                if(value.length == 40 || value.length < 40){
                    formValid.status = true;
                    callback(true);
                } else {
                    formValid.status = false;
                    callback(false);
                }
            }, 1000);
        }

        var paystubContainer = document.getElementById('invoiceTable');
        var paystubHot = new Handsontable(paystubContainer, {
            minRows: 10,
            minCols: 6,
            rowHeaders: true,
            colHeaders: [
                'Sale Date', 'First Name', 'Last Name', 'Address', 'City', 'Sale Status', 'Amount'
            ],
            colWidths: [
                120, 140, 160, 270, 150, 100, 100
            ],
            contextMenu: true,
            allowInsertColumn: false,
            allowRemoveColumn: false,
            minSpareRows: 1,
            data: invoiceData,
            dataSchema: {
                sale_date: null,
                custName: { first_name: null, last_name: null },
                address: null,
                city: null,
                status: null,
                amount: null
            },
            columns: [
                {data: 'sale_date', type: 'date', dateFormat: 'MM-DD-YYYY', correctFormat: true},
                {data: 'first_name'},
                {data: 'last_name'},
                {data: 'address'},
                {data: 'city'},
                {data: 'status', validator: lengthValidator},
                {data: 'amount'}
            ]
        });

        var overrideContainer = document.getElementById('overridesTable');
        var overHot = new Handsontable(overrideContainer, {
            minRows: 3,
            maxRows: 15,
            rowHeaders: true,
            colHeaders: ['Name', '# of Sales', 'Commission', 'Total'],
            colWidths: ['140', '100', '120', '100'],
            contextMenu: true,
            allowInsertColumn: false,
            allowRemoveColumn: false,
            minSpareRows: 1,
            data: overrideData,
            dataSchema: {
                name: null,
                sales: null,
                commission: null,
                total: null
            },
            columns: [
                {data: 'name'},
                {
                    data: 'sales',
                    className: 'htRight'
                },
                {
                    data: 'commission',
                    className: 'htRight',
                    type: 'numeric',
                    format: '0.00'
                },
                {
                    data: 'total',
                    className: 'htRight',
                    type: 'numeric',
                    format: '0.00'
                }
            ]
        });

        var expenseContainer = document.getElementById('expensesTable');
        var expHot = new Handsontable(expenseContainer, {
            minRows: 3,
            maxRows: 10,
            rowHeaders: true,
            colHeaders: ['Type', 'Amount', 'Notes'],
            colWidths: ['140', '100', '240'],
            contextMenu: true,
            allowInsertColumn: false,
            allowRemoveColumn: false,
            minSpareRows: 1,
            data: expenseData,
            dataSchema: {
                type: null,
                amount: null,
                notes: null
            },
            columns: [
                {data: 'type'},
                {
                    data: 'amount',
                    className: 'htRight',
                    type: 'numeric',
                    format: '0.00'
                },
                {data: 'notes'}
            ]
        });


        var prepareDataArrays = function(data, hot){
            var result = [];
            $.each(data, function(i, o){
                if(!hot.isEmptyRow(i)) result.push(o);
            });
            return result;
        };


        /*
        * handles when the user clicks save!
        *
         */
        $(document).on('click', '#saveInvoice', function(){
            setCommonUserInfo();

            var indSalesArr = [],
                overridesArr = [],
                expensesArr = [];

            var individualRows = prepareDataArrays(paystubHot.getData(), paystubHot),
                overrideRows, expenseRows;

            if(overrides) overrideRows = prepareDataArrays(overHot.getData(), overHot);
            if(expenses) expenseRows = prepareDataArrays(expHot.getData(), expHot);

            $.each(individualRows, function(i, o){
                if(o !== null && o !== undefined){
                    indSalesArr.push(setNewSale(o));
                }
            });

            $.each(overrideRows, function(i, o){
                if(o !== null && o !== undefined){
                    overridesArr.push(setNewOverride(o));
                }
            });

            $.each(expenseRows, function(i, o){
                if(o !== null && o !== undefined){
                    expensesArr.push(setNewExpense(o));
                }
            });

            var input = {
                individual: indSalesArr,
                hasOverrides: overrides,
                hasExpenses: expenses,
                overrides: overridesArr,
                expenses: expensesArr,
                vendorId: $('[data-vendorid]').data('vendorid'),
                employeeId: $('[data-agentid]').data('agentid'),
                date: moment($('#issue-date').text(), 'MM-DD-YYYY').format('YYYY-MM-DD'),
                endDate: moment($('#week-ending').text(), 'MM-DD-YYYY').format('YYYY-MM-DD')
            };

            var options = {
                url: '/invoices/handle-edit-invoice',
                type: 'POST',
                dataType: 'JSON',
                data: {
                    input: JSON.stringify(input)
                },
                afterData: afterData
            };

            /*
            * check to make sure that the end user has submitted either: sales, overrides or expenses AND
            * filled out the required form fields to ensure that the invoice can be saved
            */
            if(input.individual.length || input.hasOverrides || input.hasExpenses &&
                input.vendorId > -1 &&
                input.employeeId > 0 &&
                input.date.length &&
                input.endDate.length) {

                if(formValid.status) {
                    fireAjaxRequest(options);
                } else {
                    setMessageContainer(
                        'Please check the fields highlighted red in the status column. Max value is 40 characters.',
                        null,
                        'danger'
                    );
                }
            } else {
                var errorMsg = 'Sorry, you need to fill out the form before you can submit the invoice.';
                setMessageContainer(errorMsg, null, 'danger');
            }


            function afterData(data){
                if(data.status){
                    setMessageContainer(data.message);
                } else {
                    setMessageContainer(data.message, null, 'danger');
                }
            }

        });
});