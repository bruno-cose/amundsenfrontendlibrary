import * as React from "react";
import { IFieldProps } from "./Field";
import './styles.scss';


export interface IFormContext extends IFormState {
  /* Function that allows values in the values state to be set */
  setValues: (values: IValues) => void;

  /* Function that validates a field */
  validate: (fieldName: string) => void;
}

/*
 * The context which allows state and functions to be shared with Field.
 * Note that we need to pass createContext a default value which is why undefined is unioned in the type
 */
export const FormContext = React.createContext<IFormContext | undefined>(
  undefined
);

export interface IFields {
  [key: string]: IFieldProps;
}

interface IFormProps {
  /* The http path that the form will be posted to */
  action: string;

  /* The props for all the fields on the form */
  fields: IFields;

  /* A prop which allows content to be injected */
  render: () => React.ReactNode
}

export interface IValues {
  /* Key value pairs for all the field values with key being the field name */
  [key: string]: any;
}

export interface IErrors {
  /* The validation error messages for each field (key is the field name */
  [key: string]: string;
}

export interface IFormState {
  /* The field values */
  values: IValues;

  /* The field validation error messages */
  errors: IErrors;

  /* Whether the form has been successfully submitted */
  submitSuccess?: boolean;
}

/**
 * Validates whether a field has a value
 * @param {IValues} values - All the field values in the form
 * @param {string} fieldName - The field to validate
 * @returns {string} - The error message
 */
 export const required = (values: IValues, fieldName: string): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

/**
 * Validates whether a field is a valid email
 * @param {IValues} values - All the field values in the form
 * @param {string} fieldName - The field to validate
 * @returns {string} - The error message
 */
export const isEmail = (values: IValues, fieldName: string): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === "" ||
  values[fieldName] &&
  values[fieldName].search(
    /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
  )
    ? "This must be in a valid email format"
    : ""


export class Form extends React.Component<IFormProps, IFormState> {
  constructor(props: IFormProps) {
    super(props);

    const errors: IErrors = {};
    const values: IValues = {};
    this.state = {
      errors,
      values
    };
  }
  /**
   * Stores new field values in state
   * @param {IValues} values - The new field values
   */
  private setValues = (values: IValues) => {
   this.setState({ values: { ...this.state.values, ...values } });
  };


  /**
   * Returns whether there are any errors in the errors object that is passed in
   * @param {IErrors} errors - The field errors
   */
  private haveErrors(errors: IErrors) {
    let haveError: boolean = false;
    Object.keys(errors).map((key: string) => {
      if (errors[key].length > 0) {
        haveError = true;
      }
    });
    return haveError;
  }
  /**
   * Handles form submission
   * @param {React.FormEvent<HTMLFormElement>} e - The form event
   */

  private handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (this.validateForm()) {
      const submitSuccess: boolean = await this.submitForm();
      this.setState({ submitSuccess });
    }
  };

  /**
   * Executes the validation rule for the field and updates the form errors
   * @param {string} fieldName - The field to validate
   * @returns {string} - The error message
   */
  private validate = (fieldName: string): string => {
     let newError: string = "";

     if (
       this.props.fields[fieldName] &&
       this.props.fields[fieldName].validation
     ) {
       newError = this.props.fields[fieldName].validation!.rule(
         this.state.values,
         fieldName,
         this.props.fields[fieldName].validation!.args
       );
     }
     this.state.errors[fieldName] = newError;
     this.setState({
        errors: { ...this.state.errors, [fieldName]: newError }
     });
     return newError;
  };

  /**
   * Executes the validation rules for all the fields on the form and sets the error state
   * @returns {boolean} - Whether the form is valid or not
   */
  private validateForm(): boolean {
    const errors: IErrors = {};
    Object.keys(this.props.fields).map((fieldName: string) => {
      errors[fieldName] = this.validate(fieldName);
    });
    this.setState({ errors });
    return !this.haveErrors(errors);
  }


  /**
   * Submits the form to the http api
   * @returns {boolean} - Whether the form submission was successful or not
   */
   private async submitForm(): Promise<boolean> {
     var jsonText = JSON.stringify(this.state.values)
     var actualObj = JSON.parse(jsonText)
     if (actualObj.hasOwnProperty('service')) {
       actualObj.database = "oracle"
     }
     if (actualObj.hasOwnProperty('server')) {
       actualObj.database = "azure"
     }
     if (actualObj.hasOwnProperty('url')) {
       actualObj.database = "aurora"
     }
     try {
       const response = await fetch(this.props.action, {
         method: "post",
         headers: new Headers({
           "Content-Type": "application/json",
           Accept: "application/json"
         }),
         body: JSON.stringify(actualObj)
       });
       if (response.status === 400) {
         /* Map the validation errors to IErrors */
         let responseBody: any;
         responseBody = await response.json();
         const errors: IErrors = {};
         Object.keys(responseBody).map((key: string) => {
           const fieldName = key;
           errors[fieldName] = responseBody[key];
         });
         this.setState({ errors });
         console.log(this.state.errors)
       }
       return response.ok;
     } catch (ex) {
       return false;
     }
   }

  public render() {
    const { submitSuccess, errors } = this.state;
    const context: IFormContext = {
    ...this.state,
    setValues: this.setValues,
    validate: this.validate
    };

    return (
    <FormContext.Provider value={context}>
      <form onSubmit={this.handleSubmit} noValidate={true}>
        <div className="container">
          {this.props.render()}
          <div className="form-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={this.haveErrors(errors)}
            >
              Submit
            </button>
          </div>
          {submitSuccess && (
            <div className="alert alert-info" role="alert">
              The form was successfully submitted!
            </div>
          )}
          {submitSuccess === false &&
            !this.haveErrors(errors) && (
              <div className="alert alert-danger" role="alert">
                Sorry, an unexpected error has occurred
              </div>
            )}
          {submitSuccess === false &&
            this.haveErrors(errors) && (
              <div className="alert alert-danger" role="alert">
                {errors["message"]}
              </div>
            )}
          </div>
        </form>
      </FormContext.Provider>
    );
  }
}
