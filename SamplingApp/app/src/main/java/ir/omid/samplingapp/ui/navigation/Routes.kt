package ir.omid.samplingapp.ui.navigation

object Routes {
    const val PATIENT_HOME = "patient_home"
    const val NEW_REQUEST = "new_request"
    const val ADDRESS_PICKER = "address_picker"
    const val ADMIN_HOME = "admin_home"
    const val REQUEST_DETAIL = "request_detail/{requestId}"

    fun requestDetail(id: String) = "request_detail/$id"
}
