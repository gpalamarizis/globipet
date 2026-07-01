"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
var react_1 = require("react");
var expo_router_1 = require("expo-router");
var expo_status_bar_1 = require("expo-status-bar");
var react_native_gesture_handler_1 = require("react-native-gesture-handler");
var react_query_1 = require("@tanstack/react-query");
var SplashScreen = require("expo-splash-screen");
SplashScreen.preventAutoHideAsync();
var queryClient = new react_query_1.QueryClient({
    defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } }
});
function RootLayout() {
    (0, react_1.useEffect)(function () { SplashScreen.hideAsync(); }, []);
    return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <expo_status_bar_1.StatusBar style="dark"/>
        <expo_router_1.Stack screenOptions={{ headerShown: false }}>
          <expo_router_1.Stack.Screen name="(tabs)"/>
          <expo_router_1.Stack.Screen name="auth/login" options={{ presentation: 'modal' }}/>
          <expo_router_1.Stack.Screen name="auth/register" options={{ presentation: 'modal' }}/>
          <expo_router_1.Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }}/>
          <expo_router_1.Stack.Screen name="telehealth" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="tracker" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="insurance" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="passport" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="ai-health" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="ai-emotion" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="playdates" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="communities" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="social" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="bookings" options={{ presentation: 'card' }}/>
          <expo_router_1.Stack.Screen name="orders" options={{ presentation: 'card' }}/>
        </expo_router_1.Stack>
      </react_query_1.QueryClientProvider>
    </react_native_gesture_handler_1.GestureHandlerRootView>);
}
