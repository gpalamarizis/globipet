"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TabLayout;
var expo_router_1 = require("expo-router");
var lucide_react_native_1 = require("lucide-react-native");
var ORANGE = '#E65100';
function TabLayout() {
    return (<expo_router_1.Tabs screenOptions={{
            tabBarActiveTintColor: ORANGE,
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#F3F4F6',
                borderTopWidth: 1,
                height: 64,
                paddingBottom: 10,
                paddingTop: 6,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            headerShown: false,
        }}>
      <expo_router_1.Tabs.Screen name="index" options={{ title: 'Αρχική', tabBarIcon: function (_a) {
            var color = _a.color, size = _a.size;
            return <lucide_react_native_1.Home size={size} color={color}/>;
        } }}/>
      <expo_router_1.Tabs.Screen name="discover" options={{ title: 'Εξερεύνηση', tabBarIcon: function (_a) {
            var color = _a.color, size = _a.size;
            return <lucide_react_native_1.Search size={size} color={color}/>;
        } }}/>
      <expo_router_1.Tabs.Screen name="pets" options={{ title: 'Κατοικίδια', tabBarIcon: function (_a) {
            var color = _a.color, size = _a.size;
            return <lucide_react_native_1.PawPrint size={size} color={color}/>;
        } }}/>
      <expo_router_1.Tabs.Screen name="community" options={{ title: 'Κοινότητα', tabBarIcon: function (_a) {
            var color = _a.color, size = _a.size;
            return <lucide_react_native_1.Users size={size} color={color}/>;
        } }}/>
      <expo_router_1.Tabs.Screen name="profile" options={{ title: 'Προφίλ', tabBarIcon: function (_a) {
            var color = _a.color, size = _a.size;
            return <lucide_react_native_1.User size={size} color={color}/>;
        } }}/>

      {/* Hidden from tab bar */}
      <expo_router_1.Tabs.Screen name="social" options={{ href: null }}/>
      <expo_router_1.Tabs.Screen name="marketplace" options={{ href: null }}/>
      <expo_router_1.Tabs.Screen name="services" options={{ href: null }}/>
      <expo_router_1.Tabs.Screen name="insurance" options={{ href: null }}/>
      <expo_router_1.Tabs.Screen name="cart" options={{ href: null }}/>
    </expo_router_1.Tabs>);
}
