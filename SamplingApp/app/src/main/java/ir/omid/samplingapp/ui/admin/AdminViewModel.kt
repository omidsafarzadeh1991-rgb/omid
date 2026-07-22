package ir.omid.samplingapp.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import ir.omid.samplingapp.data.model.RequestStatus
import ir.omid.samplingapp.data.model.SampleRequest
import ir.omid.samplingapp.data.repository.RequestRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AdminViewModel(
    private val adminUid: String,
    private val requestRepository: RequestRepository = RequestRepository()
) : ViewModel() {

    private val _pendingRequests = MutableStateFlow<List<SampleRequest>>(emptyList())
    val pendingRequests: StateFlow<List<SampleRequest>> = _pendingRequests.asStateFlow()

    private val _allRequests = MutableStateFlow<List<SampleRequest>>(emptyList())
    val allRequests: StateFlow<List<SampleRequest>> = _allRequests.asStateFlow()

    init {
        viewModelScope.launch {
            requestRepository.observePendingRequests().collect { _pendingRequests.value = it }
        }
        viewModelScope.launch {
            requestRepository.observeAllRequests().collect { _allRequests.value = it }
        }
    }

    fun confirm(requestId: String) = updateStatus(requestId, RequestStatus.CONFIRMED)
    fun reject(requestId: String) = updateStatus(requestId, RequestStatus.REJECTED)
    fun markDone(requestId: String) = updateStatus(requestId, RequestStatus.DONE)

    private fun updateStatus(requestId: String, status: RequestStatus) {
        viewModelScope.launch {
            requestRepository.updateStatus(requestId, status, adminUid)
        }
    }
}

class AdminViewModelFactory(private val adminUid: String) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return AdminViewModel(adminUid) as T
    }
}
