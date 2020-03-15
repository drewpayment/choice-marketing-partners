
export interface State {
    StateName: string;
    Cities: string[];
}

export interface Country {
    CountryName: string;
    States: State[];
}

export interface NationStateResult {
    Countries: Country[];
}
