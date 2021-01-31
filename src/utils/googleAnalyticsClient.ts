import GoogleAuthCredentials from "./googleAuthCredentials";
import {google} from "googleapis";

const GoogleAnalyticsClient = google.analyticsdata({
    version: 'v1alpha',
    auth: GoogleAuthCredentials,
})

export default GoogleAnalyticsClient;
