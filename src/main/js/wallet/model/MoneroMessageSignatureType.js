/**
 * Enumerate message signature types.
 * 
 * @hideconstructor
 */
class MoneroMessageSignatureType {}

/**
 * Sign with spend key (value=0).
 */
MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY = 0;

/**
 * Sign with the view key (value=1).
 */
MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY = 1;

module.exports = MoneroMessageSignatureType;