/**
 * Enumerate key image spent statuses.
 * 
 * @hideconstructor
 */
class MoneroKeyImageSpentStatus {}

/**
 * Key image is not spent (value=0).
 */
MoneroKeyImageSpentStatus.NOT_SPENT = 0;

/**
 * Key image is confirmed (value=1).
 */
MoneroKeyImageSpentStatus.CONFIRMED = 1;

/**
 * Key image is in the pool (value=2).
 */
MoneroKeyImageSpentStatus.TX_POOL = 2;

module.exports = MoneroKeyImageSpentStatus;