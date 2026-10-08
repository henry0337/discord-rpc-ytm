// DOM attributes on <html> through which the page-world script (page.ts) hands data to the content
// script. Both worlds see the DOM, but not each other's JavaScript objects.

/** ID of the video the player is on. */
export const VIDEO_ID_ATTRIBUTE = 'data-ytm-rpc-video-id';
/** "1" while an ad is playing. */
export const AD_ATTRIBUTE = 'data-ytm-rpc-ad';
/** JSON of the TrackDetails of the current video, once fetched. */
export const DETAILS_ATTRIBUTE = 'data-ytm-rpc-details';
