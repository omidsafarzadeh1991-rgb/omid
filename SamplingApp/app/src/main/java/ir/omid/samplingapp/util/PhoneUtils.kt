package ir.omid.samplingapp.util

object PhoneUtils {
    private val IRAN_MOBILE_REGEX = Regex("^0?9\\d{9}$")

    /** Converts a local Iranian mobile number (e.g. 09121234567) to E.164 (+989121234567). */
    fun toE164(input: String): String? {
        val digits = input.trim().replace(" ", "")
        if (!IRAN_MOBILE_REGEX.matches(digits)) return null
        val nineDigits = if (digits.startsWith("0")) digits.substring(1) else digits
        return "+98$nineDigits"
    }
}
