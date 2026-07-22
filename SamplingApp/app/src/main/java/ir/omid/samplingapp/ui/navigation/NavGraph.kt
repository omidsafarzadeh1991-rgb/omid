package ir.omid.samplingapp.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ir.omid.samplingapp.data.model.UserProfile
import ir.omid.samplingapp.data.model.UserRole
import ir.omid.samplingapp.ui.admin.AdminHomeScreen
import ir.omid.samplingapp.ui.admin.AdminViewModel
import ir.omid.samplingapp.ui.admin.AdminViewModelFactory
import ir.omid.samplingapp.ui.admin.RequestDetailScreen
import ir.omid.samplingapp.ui.auth.AuthStep
import ir.omid.samplingapp.ui.auth.AuthViewModel
import ir.omid.samplingapp.ui.auth.OtpScreen
import ir.omid.samplingapp.ui.auth.PhoneLoginScreen
import ir.omid.samplingapp.ui.auth.ProfileSetupScreen
import ir.omid.samplingapp.ui.map.AddressPickerScreen
import ir.omid.samplingapp.ui.patient.NewRequestScreen
import ir.omid.samplingapp.ui.patient.PatientHomeScreen
import ir.omid.samplingapp.ui.patient.PatientViewModel
import ir.omid.samplingapp.ui.patient.PatientViewModelFactory

@Composable
fun SamplingNavGraph() {
    val authViewModel: AuthViewModel = viewModel()
    val step by authViewModel.step.collectAsState()
    val isLoading by authViewModel.isLoading.collectAsState()
    val errorMessage by authViewModel.errorMessage.collectAsState()

    when (val currentStep = step) {
        is AuthStep.EnterPhone -> PhoneLoginScreen(
            isLoading = isLoading,
            errorMessage = errorMessage,
            onSendCode = { activity, phone -> authViewModel.sendCode(activity, phone) }
        )

        is AuthStep.EnterOtp -> OtpScreen(
            phone = currentStep.phone,
            isLoading = isLoading,
            errorMessage = errorMessage,
            onVerify = { code -> authViewModel.verifyCode(code) },
            // Simplification: send the user back to re-enter the phone number rather
            // than reusing Firebase's forceResendingToken for a true "resend".
            onResend = { authViewModel.signOut() }
        )

        is AuthStep.EnterName -> ProfileSetupScreen(
            isLoading = isLoading,
            onSave = { name -> authViewModel.saveName(name) }
        )

        is AuthStep.SignedIn -> {
            val profile = currentStep.profile
            if (profile.role == UserRole.ADMIN.name) {
                AdminNavHost(adminUid = profile.uid, onLogout = authViewModel::signOut)
            } else {
                PatientNavHost(profile = profile, onLogout = authViewModel::signOut)
            }
        }
    }
}

@Composable
private fun PatientNavHost(profile: UserProfile, onLogout: () -> Unit) {
    val navController: NavHostController = rememberNavController()
    val patientViewModel: PatientViewModel = viewModel(factory = PatientViewModelFactory(profile))
    val requests by patientViewModel.requests.collectAsState()
    val isSubmitting by patientViewModel.isSubmitting.collectAsState()
    val submitError by patientViewModel.submitError.collectAsState()

    // Hoisted here so the picked address survives navigating to/from the map screen.
    var pickedAddress by remember { mutableStateOf("") }
    var pickedLat by remember { mutableStateOf(0.0) }
    var pickedLng by remember { mutableStateOf(0.0) }

    NavHost(navController = navController, startDestination = Routes.PATIENT_HOME) {
        composable(Routes.PATIENT_HOME) {
            PatientHomeScreen(
                requests = requests,
                onNewRequest = { navController.navigate(Routes.NEW_REQUEST) },
                onLogout = onLogout
            )
        }
        composable(Routes.NEW_REQUEST) {
            NewRequestScreen(
                selectedAddress = pickedAddress,
                isSubmitting = isSubmitting,
                submitError = submitError,
                onPickAddress = { navController.navigate(Routes.ADDRESS_PICKER) },
                onSubmit = { note ->
                    patientViewModel.submitRequest(pickedAddress, pickedLat, pickedLng, note) {
                        pickedAddress = ""
                        navController.popBackStack(Routes.PATIENT_HOME, inclusive = false)
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable(Routes.ADDRESS_PICKER) {
            AddressPickerScreen(
                onBack = { navController.popBackStack() },
                onAddressConfirmed = { lat, lng, address ->
                    pickedLat = lat
                    pickedLng = lng
                    pickedAddress = address
                    navController.popBackStack()
                }
            )
        }
    }
}

@Composable
private fun AdminNavHost(adminUid: String, onLogout: () -> Unit) {
    val navController: NavHostController = rememberNavController()
    val adminViewModel: AdminViewModel = viewModel(factory = AdminViewModelFactory(adminUid))
    val pending by adminViewModel.pendingRequests.collectAsState()
    val all by adminViewModel.allRequests.collectAsState()

    NavHost(navController = navController, startDestination = Routes.ADMIN_HOME) {
        composable(Routes.ADMIN_HOME) {
            AdminHomeScreen(
                pendingRequests = pending,
                allRequests = all,
                onOpenRequest = { id -> navController.navigate(Routes.requestDetail(id)) },
                onLogout = onLogout
            )
        }
        composable(
            route = Routes.REQUEST_DETAIL,
            arguments = listOf(navArgument("requestId") { type = NavType.StringType })
        ) { backStackEntry ->
            val requestId = backStackEntry.arguments?.getString("requestId")
            val request = (pending + all).firstOrNull { it.id == requestId }
            if (request != null) {
                RequestDetailScreen(
                    request = request,
                    onBack = { navController.popBackStack() },
                    onConfirm = {
                        adminViewModel.confirm(request.id)
                        navController.popBackStack()
                    },
                    onReject = {
                        adminViewModel.reject(request.id)
                        navController.popBackStack()
                    },
                    onMarkDone = {
                        adminViewModel.markDone(request.id)
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
