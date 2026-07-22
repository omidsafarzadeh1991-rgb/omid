package ir.omid.samplingapp.data.repository

import android.app.Activity
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

sealed interface OtpEvent {
    data class CodeSent(val verificationId: String) : OtpEvent
    data class AutoVerified(val credential: PhoneAuthCredential) : OtpEvent
    data class Failed(val message: String) : OtpEvent
}

class AuthRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    val currentUser get() = auth.currentUser

    /**
     * Starts Firebase phone verification. Emits [OtpEvent.CodeSent] once the SMS is on
     * its way, or [OtpEvent.AutoVerified] if the device auto-detects the code (no OTP
     * screen needed in that case).
     */
    fun sendVerificationCode(activity: Activity, phoneNumber: String): Flow<OtpEvent> = callbackFlow {
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                trySend(OtpEvent.AutoVerified(credential))
            }

            override fun onVerificationFailed(e: FirebaseException) {
                trySend(OtpEvent.Failed(e.message ?: "خطا در ارسال کد تأیید"))
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                trySend(OtpEvent.CodeSent(verificationId))
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()

        PhoneAuthProvider.verifyPhoneNumber(options)

        awaitClose { }
    }

    suspend fun signInWithCode(verificationId: String, code: String) {
        val credential = PhoneAuthProvider.getCredential(verificationId, code)
        signInWithCredential(credential)
    }

    suspend fun signInWithCredential(credential: PhoneAuthCredential) {
        auth.signInWithCredential(credential).await()
    }

    fun signOut() = auth.signOut()
}
