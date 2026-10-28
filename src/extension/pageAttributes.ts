// DOM attributes on <html> through which the page-world script (page.ts) hands data to the content
// script. Both worlds see the DOM, but not each other's JavaScript objects.

/** ID of the video the player is on. */
export const VIDEO_ID_ATTRIBUTE = 'data-ytm-rpc-video-id';
/** "1" while an ad is playing. */
export const AD_ATTRIBUTE = 'data-ytm-rpc-ad';
/** JSON of the TrackDetails of the current video, once fetched. */
export const DETAILS_ATTRIBUTE = 'data-ytm-rpc-details';
/** JSON list of the channel IDs known to be Japanese artists: the content script's memory, for the page script. */
export const NATIVE_ATTRIBUTE = 'data-ytm-rpc-native';
/** JSON `[channelId, videoId]` pairs the page script saw on Japanese titles, for the content script to remember. */
export const LEARNED_ATTRIBUTE = 'data-ytm-rpc-learned';
/** JSON `[currentTime, duration, readAt]` from the player API: where the player is within the current track. */
export const POSITION_ATTRIBUTE = 'data-ytm-rpc-position';
