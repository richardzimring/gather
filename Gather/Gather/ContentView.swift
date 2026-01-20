import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthManager.shared
    @State private var showWelcome = true
    @State private var showAuth = false

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else if showWelcome {
                WelcomeView(showAuth: $showAuth)
                    .sheet(isPresented: $showAuth) {
                        AuthFlowView()
                    }
                    .onChange(of: authManager.isAuthenticated) { _, newValue in
                        if newValue {
                            showAuth = false
                            showWelcome = false
                        }
                    }
            } else {
                // Loading state while checking auth
                LoadingView(message: "Loading...")
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }
                .tag(0)

            AvailabilityView()
                .tabItem {
                    Label("Availability", systemImage: "calendar")
                }
                .tag(1)

            FriendsView()
                .tabItem {
                    Label("Friends", systemImage: "person.2")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(3)
        }
        .tint(Color.white)
    }
}

#Preview {
    ContentView()
}
