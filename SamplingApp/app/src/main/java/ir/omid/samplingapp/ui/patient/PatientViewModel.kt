package ir.omid.samplingapp.ui.patient

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import ir.omid.samplingapp.data.model.SampleRequest
import ir.omid.samplingapp.data.model.UserProfile
import ir.omid.samplingapp.data.repository.RequestRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PatientViewModel(
    private val profile: UserProfile,
    private val requestRepository: RequestRepository = RequestRepository()
) : ViewModel() {

    private val _requests = MutableStateFlow<List<SampleRequest>>(emptyList())
    val requests: StateFlow<List<SampleRequest>> = _requests.asStateFlow()

    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _submitError = MutableStateFlow<String?>(null)
    val submitError: StateFlow<String?> = _submitError.asStateFlow()

    init {
        viewModelScope.launch {
            requestRepository.observeMyRequests(profile.uid).collect { _requests.value = it }
        }
    }

    fun submitRequest(address: String, lat: Double, lng: Double, note: String, onDone: () -> Unit) {
        _isSubmitting.value = true
        _submitError.value = null
        viewModelScope.launch {
            try {
                requestRepository.submitRequest(
                    SampleRequest(
                        patientId = profile.uid,
                        patientName = profile.name,
                        patientPhone = profile.phone,
                        addressText = address,
                        lat = lat,
                        lng = lng,
                        note = note
                    )
                )
                onDone()
            } catch (e: Exception) {
                _submitError.value = "ثبت درخواست با خطا مواجه شد"
            } finally {
                _isSubmitting.value = false
            }
        }
    }
}

class PatientViewModelFactory(private val profile: UserProfile) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return PatientViewModel(profile) as T
    }
}
