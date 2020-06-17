/**
 * Enumerates send priorities.
 * 
 * @hideconstructor
 */
class MoneroTxPriority {}

/**
 * Default priority (i.e. normal) (value=0).
 */
MoneroTxPriority.DEFAULT = 0;

/**
 * Unimportant priority (value=1).
 */
MoneroTxPriority.UNIMPORTANT = 1;

/**
 * Normal priority (value=2).
 */
MoneroTxPriority.NORMAL = 2;

/**
 * Elevated priority (value=3).
 */
MoneroTxPriority.ELEVATED = 3;

module.exports = MoneroTxPriority;