package ir.omid.samplingapp.ui.auth

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ir.omid.samplingapp.data.model.UserProfile
import ir.omid.samplingapp.data.repository.AuthRepository
import ir.omid.samplingapp.data.repository.OtpEvent
import ir.omid.samplingapp.data.repository.UserRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AuthStep {
    data object EnterPhone : AuthStep
    data class EnterOtp(val phone: String) : AuthStep
    data object EnterName : AuthStep
    data class SignedIn(val profile: UserProfile) : AuthStep
}

// @JvmOverloads generates a real zero-arg constructor overload, which the default
// ViewModelProvider factory needs (it instantiates via plain Java reflection).
class AuthViewModel @JvmOverloads constructor(
    private val authRepository: AuthRepository = AuthRepository(),
    private val userRepository: UserRepository = UserRepository()
) : ViewModel() {

    private val _step = MutableStateFlow<AuthStep>(AuthStep.EnterPhone)
    val step: StateFlow<AuthStep> = _step.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private var verificationId: String? = null
    private var pendingPhone: String = ""
    private var otpJob: Job? = null

    init {
        val user = authRepository.currentUser
        if (user != null) {
            viewModelScope.launch { loadOrCreateProfile(user.uid, user.phoneNumber ?: "") }
        }
    }

    fun sendCode(activity: Activity, phoneE164: String) {
        pendingPhone = phoneE164
        _isLoading.value = true
        _errorMessage.value = null
        otpJob?.cancel()
        otpJob = viewModelScope.launch {
            authRepository.sendVerificationCode(activity, phoneE164).collect { event ->
                when (event) {
                    is OtpEvent.CodeSent -> {
                        verificationId = event.verificationId
                        _isLoading.value = false
                        _step.value = AuthStep.EnterOtp(phoneE164)
                    }

                    is OtpEvent.AutoVerified -> {
                        authRepository.signInWithCredential(event.credential)
                        onSignedIn()
                        _isLoading.value = false
                    }

                    is OtpEvent.Failed -> {
                        _isLoading.value = false
                        _errorMessage.value = event.message
                    }
                }
            }
        }
    }

    fun verifyCode(code: String) {
        val id = verificationId ?: return
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            try {
                authRepository.signInWithCode(id, code)
                onSignedIn()
            } catch (e: Exception) {
                _errorMessage.value = "کد وارد شده اشتباه است"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun onSignedIn() {
        val user = authRepository.currentUser ?: return
        loadOrCreateProfile(user.uid, user.phoneNumber ?: pendingPhone)
    }

    private suspend fun loadOrCreateProfile(uid: String, phone: String) {
        val existing = userRepository.getProfile(uid)
        if (existing != null) {
            _step.value = AuthStep.SignedIn(existing)
        } else {
            pendingPhone = phone
            _step.value = AuthStep.EnterName
        }
    }

    fun saveName(name: String) {
        val user = authRepository.currentUser ?: return
        _isLoading.value = true
        viewModelScope.launch {
            userRepository.createPatientProfile(user.uid, pendingPhone, name)
            val profile = userRepository.getProfile(user.uid)
            _isLoading.value = false
            if (profile != null) _step.value = AuthStep.SignedIn(profile)
        }
    }

    fun signOut() {
        authRepository.signOut()
        _step.value = AuthStep.EnterPhone
    }
}
