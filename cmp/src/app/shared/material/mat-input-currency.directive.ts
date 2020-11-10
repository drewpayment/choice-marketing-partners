import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { getSupportedInputTypes } from '@angular/cdk/platform';
import { CurrencyPipe } from '@angular/common';
import { Directive, ElementRef, forwardRef, HostBinding, HostListener, Inject, Input, OnChanges, Optional, Self, SimpleChanges } from '@angular/core';
import { NgControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { getMatInputUnsupportedTypeError, MAT_INPUT_VALUE_ACCESSOR } from '@angular/material/input';
import { Subject } from 'rxjs';

let nextUniqueId = 0;

// Invalid input type. Using one of these will throw an MatInputUnsupportedTypeError.
const MAT_INPUT_INVALID_TYPES = [
    'button',
    'checkbox',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
];

@Directive({
    // tslint:disable-next-line: directive-selector
    selector: 'input[matInputCurrency]',
    exportAs: 'matInputCurrency',
    providers: [
        // {
        //     provide: MAT_INPUT_VALUE_ACCESSOR,
        //     useExisting: MatInputCurrencyDirective
        // },
        CurrencyPipe,
        {
            provide: MatFormFieldControl,
            useExisting: MatInputCurrencyDirective,
        },
    ],
    host: {
        /**
     * @breaking-change 8.0.0 remove .mat-form-field-autofill-control in favor of AutofillMonitor.
     */
        'class': 'mat-input-element mat-form-field-autofill-control',
        '[class.mat-input-server]': '_isServer',
        // Native input properties that are overwritten by Angular inputs need to be synced with
        // the native input element. Otherwise property bindings for those don't work.
        '[attr.id]': 'id',
        // At the time of writing, we have a lot of customer tests that look up the input based on its
        // placeholder. Since we sometimes omit the placeholder attribute from the DOM to prevent screen
        // readers from reading it twice, we have to keep it somewhere in the DOM for the lookup.
        '[attr.data-placeholder]': 'placeholder',
        '[disabled]': 'disabled',
        '[required]': 'required',
        '[attr.readonly]': 'readonly && !_isNativeSelect || null',
        '[attr.aria-invalid]': 'errorState',
        '[attr.aria-required]': 'required.toString()',
    }
})
export class MatInputCurrencyDirective implements OnChanges {
    // @HostBinding('style.border') border = 'none';
    protected _uid = `mat-input-currency-${nextUniqueId++}`;
    // tslint:disable-next-line: variable-name
    private _inputValueAccessor: { value: any };

    /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
    focused: boolean = false;

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    readonly stateChanges: Subject<void> = new Subject<void>();

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    controlType: string = 'mat-input';

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    autofilled = false;

    /** Whether the component is a native html select. */
    readonly _isNativeSelect: boolean;

    /** Whether the component is a textarea. */
    readonly _isTextarea: boolean;

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    @Input()
    get disabled(): boolean {
        if (this.ngControl && this.ngControl.disabled !== null) {
            return this.ngControl.disabled;
        }
        return this._disabled;
    }
    set disabled(value: boolean) {
        this._disabled = coerceBooleanProperty(value);

        // Browsers may not fire the blur event if the input is disabled too quickly.
        // Reset from here to ensure that the element doesn't become stuck.
        if (this.focused) {
            this.focused = false;
            this.stateChanges.next();
        }
    }
    protected _disabled = false;

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    @Input()
    get id(): string { return this._id; }
    set id(value: string) { this._id = value || this._uid; }
    protected _id: string;

    protected _usePercent = false;
    @Input()
    get usePercent(): boolean { return this.usePercent; }
    set usePercent(value: boolean) { this._usePercent = coerceBooleanProperty(value); }

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    @Input() placeholder: string;

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    @Input()
    get required(): boolean { return this._required; }
    set required(value: boolean) { this._required = coerceBooleanProperty(value); }
    protected _required = false;

    /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
    @Input('aria-describedby') userAriaDescribedBy: string;

    get value(): string | null {
        return this._inputValueAccessor.value;
    }

    @Input('value')
    set value(value: string | null) {
        if (value !== this.value) {
            this._inputValueAccessor.value = value;
            this.stateChanges.next();
            this.formatValue(value);
        }
    }

    /** Input type of the element. */
    @Input()
    get type(): string { return this._type; }
    set type(value: string) {
        this._type = value || 'text';
        this._validateType();

        // When using Angular inputs, developers are no longer able to set the properties on the native
        // input element. To ensure that bindings for `type` work, we need to sync the setter
        // with the native property. Textarea elements don't support the type property or attribute.
        if (!this._isTextarea && getSupportedInputTypes().has(this._type)) {
            (this.el.nativeElement as HTMLInputElement).type = this._type;
        }
    }
    protected _type = 'text';

    protected _neverEmptyInputTypes = [
        'date',
        'datetime',
        'datetime-local',
        'month',
        'time',
        'week'
    ].filter(t => getSupportedInputTypes().has(t));

    constructor(
        @Optional() @Self() public ngControl: NgControl,
        private el: ElementRef,
        private currPipe: CurrencyPipe,
        @Optional() @Self() @Inject(MAT_INPUT_VALUE_ACCESSOR) inputValueAccessor: any,
    ) {
        const element = this.el.nativeElement;
        // If no input value accessor was explicitly specified, use the element as the input value
        // accessor.
        this._inputValueAccessor = inputValueAccessor || element;
        this.formatValue(this._inputValueAccessor.value);
    }

    ngOnChanges(changes: SimpleChanges) {
        console.dir(changes);
        this.formatValue(this._inputValueAccessor.value);
    }

    /** Make sure the input is a supported type. */
    protected _validateType() {
        if (MAT_INPUT_INVALID_TYPES.indexOf(this._type) > -1) {
            throw getMatInputUnsupportedTypeError(this._type);
        }
    }

    private formatValue(value: string | null) {
        if (value !== null) {
            this.el.nativeElement.value = this.currPipe.transform(value);
        } else {
            this.el.nativeElement.value = '';
        }
    }

    private unformatValue(value: string | null): string | null {
        return value.replace(/[^\d.-]/g, '');
    }

    @HostListener('input', ['$event.target.value'])
    onInput(value) {
        // here we cut any non numerical symbols
        this._inputValueAccessor.value = this.unformatValue(value);
        this._onChange(this._inputValueAccessor.value);
    }

    @HostListener('blur')
    _onBlur() {
        this.formatValue(this._inputValueAccessor.value);
    }

    @HostListener('focus')
    onFocus() {
        const value = this.el.nativeElement.value;
        this._inputValueAccessor.value = this.unformatValue(value);

        if (value) {
            this.el.nativeElement.value = this._inputValueAccessor.value;
        } else {
            this.el.nativeElement.value = '';
        }
    }

    _onChange(value: any): void {
    }

    writeValue(value: any) {
        this._inputValueAccessor.value = value;
        this.formatValue(this._inputValueAccessor.value); // format Value
    }

    registerOnChange(fn: (value: any) => void) {
        this._onChange = fn;
    }

    registerOnTouched() {
    }

    /** Focuses the input. */
    focus(options?: FocusOptions): void {
        this.el.nativeElement.focus(options);
    }

    /** Checks whether the input type is one of the types that are never empty. */
    protected _isNeverEmpty() {
        return this._neverEmptyInputTypes.indexOf(this._type) > -1;
    }

    /** Checks whether the input is invalid based on the native validation. */
    protected _isBadInput() {
        // The `validity` property won't be present on platform-server.
        let validity = (this.el.nativeElement as HTMLInputElement).validity;
        return validity && validity.badInput;
    }

    /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
    get empty(): boolean {
        return !this._isNeverEmpty() && !this.el.nativeElement.value && !this._isBadInput() &&
            !this.autofilled;
    }

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    get shouldLabelFloat(): boolean {
        if (this._isNativeSelect) {
            // For a single-selection `<select>`, the label should float when the selected option has
            // a non-empty display value. For a `<select multiple>`, the label *always* floats to avoid
            // overlapping the label with the options.
            const selectElement = this.el.nativeElement as HTMLSelectElement;
            const firstOption: HTMLOptionElement | undefined = selectElement.options[0];

            // On most browsers the `selectedIndex` will always be 0, however on IE and Edge it'll be
            // -1 if the `value` is set to something, that isn't in the list of options, at a later point.
            return this.focused || selectElement.multiple || !this.empty ||
                !!(selectElement.selectedIndex > -1 && firstOption && firstOption.label);
        } else {
            return this.focused || !this.empty;
        }
    }

    /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
    setDescribedByIds(ids: string[]) {
        if (ids.length) {
            this.el.nativeElement.setAttribute('aria-describedby', ids.join(' '));
        } else {
            this.el.nativeElement.removeAttribute('aria-describedby');
        }
    }

    /**
     * Implemented as part of MatFormFieldControl.
     * @docs-private
     */
    onContainerClick() {
        // Do not re-focus the input element if the element is already focused. Otherwise it can happen
        // that someone clicks on a time input and the cursor resets to the "hours" field while the
        // "minutes" field was actually clicked. See: https://github.com/angular/components/issues/12849
        if (!this.focused) {
            this.focus();
        }
    }

}
