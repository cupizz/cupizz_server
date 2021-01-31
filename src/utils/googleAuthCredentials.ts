import {GoogleApiScopes} from "../constants/googleApiScopes";
import {google} from "googleapis";


const {GOOGLE_APPLICATION_CREDENTIALS} = process.env;

const GoogleAuthCredentials = new google.auth.GoogleAuth({
    keyFile: GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [
        GoogleApiScopes.GoogleServiceAnalytics.ANALYTICS_READONLY
    ],
});

export default GoogleAuthCredentials;

