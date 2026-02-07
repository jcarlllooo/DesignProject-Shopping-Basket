// app/Signup.js
import React, { useState, useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { View, TouchableOpacity, Alert, Text } from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DatabaseContext } from './_layout';
import {
  StyledContainer,
  InnerContainer,
  PageLogo,
  PageTitle,
  SubTitle,
  StyledFormArea,
  LeftIcon,
  StyledInputLabel,
  StyledTextInput,
  RightIcon,
  StyledButton,
  ButtonText,
  MsgBox,
  Line,
  Colors,
  ExtraView,
  ExtraText,
  TextLink,
  TextLinkContent,
} from "../components/styles";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import KeyboardAvoidingWrapper from "../components/KeyboardAvoidingWrapper";
import { insertUser, getUserByEmail } from "../databases/accountDB";

const { brand, darkLight, primary } = Colors;

const Signup = () => {
  const router = useRouter();
  const dbs = useContext(DatabaseContext);

  const [hidePassword, setHidePassword] = useState(true);
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [dateOfBirth, setDob] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    setDob(currentDate);
  };

  const showDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      onChange,
      mode: "date",
      is24Hour: true,
    });
  };

  const handleSignup = async () => {
    // basic checks
    if (!dbs || !dbs.accountsDb) {
      Alert.alert("Error", "Account database not ready. Please wait or restart the app.");
      return;
    }
    if (!fullName || !email || !dateOfBirth || !password || !confirmPassword) {
      setMessage("Please fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage(""); // clear existing

    try {
      console.log("Signup: attempting insert for email:", email);

      // Optional: check if user already exists (gives friendlier UX than catching a constraint error)
      try {
        const existing = await getUserByEmail(dbs.accountsDb, email.trim().toLowerCase());
        if (existing) {
          Alert.alert("Error", "This email address is already registered.");
          return;
        }
      } catch (checkErr) {
        // if getUserByEmail isn't implemented or fails, we still proceed to attempt insert and rely on unique constraint handling.
        console.warn("Could not check existing user:", checkErr);
      }

      // insert user
      const dobString = dateOfBirth.toISOString().split("T")[0];
      await insertUser(dbs.accountsDb, fullName.trim(), email.trim().toLowerCase(), dobString, password);

      Alert.alert("Success", "Account created successfully!");
      // navigate to Welcome (match your earlier behavior)
      router.replace({ pathname: "Welcome", params: { email: email.trim().toLowerCase() } });
    } catch (error) {
      console.error("Signup Insert error:", error);

      // best-effort friendly messages depending on error shape
      const msg = (error && error.message) ? error.message : String(error);

      if (msg.includes("UNIQUE constraint failed") || msg.toLowerCase().includes("already")) {
        Alert.alert("Error", "This email address is already registered.");
      } else {
        Alert.alert("Error", "An error occurred during signup. Please try again.");
      }
      setMessage("An error occurred during signup. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingWrapper>
      <StyledContainer>
        <StatusBar style="dark" />
        <InnerContainer>
          <PageLogo
            resizeMode="cover"
            source={require("../assets/images/loginpage.png")}
          />
          <PageTitle>
            <Text>Scanner App</Text>
          </PageTitle>
          <SubTitle>
            <Text>Account Signup</Text>
          </SubTitle>

          <StyledFormArea>
            <MyTextInput
              label="Full Name"
              icon="person"
              placeholder="Juan Dela Cruz"
              placeholderTextColor={darkLight}
              onChangeText={setFullName}
              value={fullName}
            />

            <MyTextInput
              label="Email Address"
              icon="mail"
              placeholder="example@email.com"
              placeholderTextColor={darkLight}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
            />

            <MyTextInput
              label="Date of Birth"
              icon="calendar"
              placeholder="YYYY - MM - DD"
              placeholderTextColor={darkLight}
              value={dateOfBirth ? dateOfBirth.toDateString() : ""}
              isDate={true}
              editable={false}
              showDatePicker={showDatePicker}
            />

            <MyTextInput
              label="Password"
              icon="lock"
              placeholder="* * * * * * * * * *"
              placeholderTextColor={darkLight}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={hidePassword}
              isPassword={true}
              hidePassword={hidePassword}
              setHidePassword={setHidePassword}
            />

            <MyTextInput
              label="Confirm Password"
              icon="lock"
              placeholder="* * * * * * * * * *"
              placeholderTextColor={darkLight}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              secureTextEntry={hidePassword}
              isPassword={true}
              hidePassword={hidePassword}
              setHidePassword={setHidePassword}
            />

            <MsgBox>
              <Text>{message}</Text>
            </MsgBox>

            <StyledButton onPress={handleSignup}>
              <ButtonText>
                <Text>Signup</Text>
              </ButtonText>
            </StyledButton>

            <Line />

            <ExtraView>
              <ExtraText>
                <Text>Already have an account?</Text>
              </ExtraText>
              <TextLink onPress={() => router.push("Login")}>
                <TextLinkContent>
                  <Text>Login</Text>
                </TextLinkContent>
              </TextLink>
            </ExtraView>
          </StyledFormArea>
        </InnerContainer>
      </StyledContainer>
    </KeyboardAvoidingWrapper>
  );
};

const MyTextInput = ({
  label,
  icon,
  isPassword,
  hidePassword,
  setHidePassword,
  isDate,
  showDatePicker,
  ...props
}) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>
      <StyledInputLabel>
        <Text>{label}</Text>
      </StyledInputLabel>
      {isDate ? (
        <TouchableOpacity onPress={showDatePicker}>
          <StyledTextInput {...props} />
        </TouchableOpacity>
      ) : (
        <StyledTextInput {...props} />
      )}
      {isPassword && (
        <RightIcon onPress={() => setHidePassword(!hidePassword)}>
          <Ionicons
            name={hidePassword ? "eye-off" : "eye"}
            size={30}
            color={darkLight}
          />
        </RightIcon>
      )}
    </View>
  );
};

export default Signup;
