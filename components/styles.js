import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import Constants from 'expo-constants';

const { height } = Dimensions.get('window');

// Colors
export const Colors = {
  primary: '#ffffff',
  secondary: '#E5E7EB',
  tertiary: '#1F2937',
  darkLight: '#9CA3AF',
  brand: '#D0312D',
  green: '#10B981',
  red: '#D0312D',
};

const { primary, secondary, tertiary, darkLight, brand, green } = Colors;
const StatusBarHeight = Constants.statusBarHeight;

// Reusable Components (optional)
export const StyledContainer = ({ children }) => (
  <View style={styles.styledContainer}>{children}</View>
);

export const InnerContainer = ({ children }) => (
  <View style={styles.innerContainer}>{children}</View>
);

export const WelcomeContainer = ({ children }) => (
  <View style={styles.welcomeContainer}>{children}</View>
);

export const PageLogo = ({ source }) => (
  <Image style={styles.pageLogo} source={source} />
);

export const Avatar = ({ source }) => (
  <Image style={styles.avatar} source={source} />
);

export const WelcomeImage = ({ source }) => (
  <Image style={styles.welcomeImage} source={source} />
);

export const PageTitle = ({ children, welcome }) => (
  <Text style={[styles.pageTitle, welcome && styles.pageTitleWelcome]}>
    {children}
  </Text>
);

export const SubTitle = ({ children, welcome }) => (
  <Text style={[styles.subTitle, welcome && styles.subTitleWelcome]}>
    {children}
  </Text>
);

export const StyledFormArea = ({ children }) => (
  <View style={styles.formArea}>{children}</View>
);

export const StyledTextInput = (props) => (
  <TextInput style={styles.textInput} {...props} />
);

export const StyledInputLabel = ({ children }) => (
  <Text style={styles.inputLabel}>{children}</Text>
);

export const LeftIcon = ({ children }) => (
  <View style={styles.leftIcon}>{children}</View>
);

export const RightIcon = ({ children, onPress }) => (
  <TouchableOpacity style={styles.rightIcon} onPress={onPress}>
    {children}
  </TouchableOpacity>
);

// FIX: Modified to automatically wrap string children in a ButtonText component.
export const StyledButton = ({ children, google, onPress }) => (
  <TouchableOpacity
    style={[styles.button, google && styles.googleButton]}
    onPress={onPress}
  >
    {typeof children === 'string' ? <ButtonText>{children}</ButtonText> : children}
  </TouchableOpacity>
);

export const ButtonText = ({ children }) => (
  <Text style={styles.buttonText}>{children}</Text>
);

export const MsgBox = ({ children }) => (
  <Text style={styles.msgBox}>{children}</Text>
);

export const Line = () => <View style={styles.line} />;

export const ExtraView = ({ children }) => (
  <View style={styles.extraView}>{children}</View>
);

export const ExtraText = ({ children }) => (
  <Text style={styles.extraText}>{children}</Text>
);

// FIX: Modified to automatically wrap string children in a TextLinkContent component.
export const TextLink = ({ children, onPress }) => (
  <TouchableOpacity style={styles.textLink} onPress={onPress}>
    {typeof children === 'string' ? <TextLinkContent>{children}</TextLinkContent> : children}
  </TouchableOpacity>
);

export const TextLinkContent = ({ children }) => (
  <Text style={styles.textLinkContent}>{children}</Text>
);

//New exports
export const Card = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

export const H1 = ({ children }) => (
  <Text style={styles.h1}>{children}</Text>
);

export const H2 = ({ children }) => (
  <Text style={styles.h2}>{children}</Text>
);

export const Body = ({ children }) => (
  <Text style={styles.body}>{children}</Text>
);

export const Label = ({ children }) => (
  // Mapped to the specific form field label style
  <Text style={styles.formFieldLabel}>{children}</Text> 
);

export const CustomInput = (props) => (
  // Mapped to the specific custom input style
  <TextInput style={styles.customInput} {...props} /> 
);

export const HomeHeader = ({ children }) => (
  <View style={styles.homeIndexHeader}>{children}</View>
);

export const ConnectButton = ({ onPress, children }) => (
  <TouchableOpacity style={styles.connectBtn} onPress={onPress}>
    <Text style={styles.connectTxt}>{children}</Text>
  </TouchableOpacity>
);

export const SearchContainer = ({ children }) => (
  <View style={styles.searchRow}>{children}</View>
);

export const TopBar = ({ children }) => (
  <View style={styles.topBar}>{children}</View>
);

export const InventoryTitle = ({ children }) => (
  <Text style={styles.inv}>{children}</Text>
);

export const AddButton = ({ onPress, children }) => (
  <TouchableOpacity style={styles.add} onPress={onPress}>
    {children}
  </TouchableOpacity>
);

export const ListCard = ({ children }) => (
  <View style={styles.listCard}>{children}</View>
);

export const ItemImage = (props) => (
  <Image style={styles.img} {...props} />
);

export const ItemName = ({ children }) => (
  <Text style={styles.name}>{children}</Text>
);

export const EmptyListContainer = ({ children }) => (
  <View style={styles.emptyListContainer}>
    <Text style={styles.emptyListText}>{children}</Text>
  </View>
);

export const HeaderTitle = ({ children }) => (
  <Text style={styles.headerTitle}>
    {children}
  </Text>
);

export const PhotoContainer = ({ source }) => (
  // Mapped to the descriptive style name
  <Image style={styles.photoContainer} source={source} resizeMode="cover" />
);

export const PickImageButton = ({ onPress, disabled, children }) => (
  <TouchableOpacity 
    // Mapped to the descriptive style name
    style={[styles.pickImageButton, disabled && { opacity: 0.7 }]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.pickImageTxt}>{children}</Text>
  </TouchableOpacity>
);

export const QuantityContainer = ({ children }) => (
  <View style={styles.qtyContainer}>{children}</View>
);

export const QuantityText = ({ children }) => (
  <Text style={styles.qtyText}>{children}</Text>
);

export const DeleteButton = ({ onPress, children }) => (
  <TouchableOpacity style={styles.deleteButton} onPress={onPress}>
    <Text style={styles.deleteButtonText}>{children}</Text>
  </TouchableOpacity>
);

export const ConfirmDeleteOverlay = ({ children }) => (
  <View style={styles.confirmDeleteOverlay}>{children}</View>
);

export const ConfirmDeleteBox = ({ children }) => (
  <View style={styles.confirmDeleteBox}>{children}</View>
);

export const ConfirmDeleteText = ({ children }) => (
  <Text style={styles.confirmDeleteText}>{children}</Text>
);

export const ConfirmDeleteButtons = ({ children }) => (
  <View style={styles.confirmDeleteButtons}>{children}</View>
);

export const CancelButton = ({ onPress, children }) => (
  <TouchableOpacity style={styles.cancelButton} onPress={onPress}>
    <Text style={styles.cancelButtonText}>{children}</Text>
  </TouchableOpacity>
);

export const ConfirmButton = ({ onPress, children }) => (
  <TouchableOpacity style={styles.confirmButton} onPress={onPress}>
    <Text style={styles.confirmButtonText}>{children}</Text>
  </TouchableOpacity>
);

export const ConnectBasketHeader = ({ children }) => (
  <View style={styles.connectBasketHeader}>{children}</View>
);

export const IconWrapper = ({ children }) => (
  <View style={styles.iconWrap}>{children}</View>
);

export const SubLabel = ({ children }) => (
  <Text style={styles.subLabel}>{children}</Text>
);

export const ConnectBasketCard = ({ children }) => (
  <View style={styles.connectBasketCard}>{children}</View>
);

export const BasketImage = (props) => (
  <Image style={styles.basketImg} {...props} />
);

export const BasketName = ({ children }) => (
  <Text style={styles.basketName}>{children}</Text>
);

export const LayoutContainer = ({ children }) => (
  <View style={styles.layoutContainer}>{children}</View>
);

export const LoadingText = ({ children }) => (
  <Text style={styles.layoutLoadingText}>{children}</Text>
);

export const ErrorText = ({ children }) => (
  <Text style={styles.errorText}>{children}</Text>
);

export const HeaderContainer = ({ children }) => (
  // Mapped to the descriptive style name
  <View style={styles.headerContainer}>{children}</View>
);

export const ContentContainer = ({ children }) => (
  // Mapped to the descriptive style name
  <View style={styles.contentContainer}>{children}</View>
);

export const IconButton = ({ children, onPress, disabled }) => (
  <TouchableOpacity 
    style={styles.iconButton} 
    onPress={onPress}
    disabled={disabled}
  >
    {children}
  </TouchableOpacity>
);

export const PhotoSection = ({ children }) => (
  <View style={styles.photoSection}>{children}</View>
);

export const QuantitySection = ({ children }) => (
  <View style={styles.quantitySection}>{children}</View>
);

//End of new exports

// Styles
const styles = StyleSheet.create({
  styledContainer: {
    flex: 1,
    padding: 25,
    paddingTop: StatusBarHeight + 30,
    backgroundColor: primary,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  welcomeContainer: {
    padding: 25,
    paddingTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageLogo: {
    width: 250,
    height: 200,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: secondary,
    marginBottom: 10,
    marginTop: 10,
  },
  welcomeImage: {
    height: '50%',
    minWidth: '100%',
  },
  pageTitle: {
    fontSize: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    color: brand,
    padding: 10,
  },
  pageTitleWelcome: {
    fontSize: 35,
  },
  subTitle: {
    fontSize: 18,
    marginBottom: 20,
    letterSpacing: 1,
    fontWeight: 'bold',
    color: tertiary,
  },
  subTitleWelcome: {
    marginBottom: 5,
    fontWeight: 'normal',
  },
  formArea: {
    width: '90%',
    padding: 15
  },
  textInput: {
    backgroundColor: secondary,
    padding: 15,
    paddingLeft: 55,
    paddingRight: 55,
    borderRadius: 5,
    fontSize: 16,
    height: 60,
    marginVertical: 3,
    marginBottom: 10,
    color: tertiary,
  },
  inputLabel: {
    color: tertiary,
    fontSize: 13,
    textAlign: 'left',
  },
  leftIcon: {
    left: 15,
    top: 38,
    position: 'absolute',
    zIndex: 1,
  },
  rightIcon: {
    right: 15,
    top: 38,
    position: 'absolute',
    zIndex: 1,
  },
  button: {
    padding: 15,
    backgroundColor: brand,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginVertical: 5,
    height: 60,
  },
  googleButton: {
    backgroundColor: green,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: primary,
    fontSize: 16,
  },
  msgBox: {
    textAlign: 'center',
    fontSize: 13,
  },
  line: {
    height: 1,
    width: '100%',
    backgroundColor: darkLight,
  },
  extraView: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  extraText: {
    color: tertiary,
    fontSize: 15,
  },
  textLink: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textLinkContent: {
    color: brand,
    fontSize: 15,
  },
  // ModalMessage.js styles
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  messageBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  // General/Card styles
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.tertiary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.tertiary,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: Colors.tertiary,
  },
  // Renamed from 'label' (overwritten by formFieldLabel below)
  baseLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: Colors.tertiary,
  },
  // Renamed from 'input' (overwritten by customInput below)
  cardInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  // HomeIndex.js styles
  homeIndexHeader: {
    backgroundColor: '#B04638',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  connectTxt: {
    color: '#B04638',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inv: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  add: {
    backgroundColor: '#B04638',
    padding: 8,
    borderRadius: 99,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  img: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyListText: {
    fontSize: 16,
    color: '#888',
  },
  backButton: {
    // This style is now part of the topBar flexbox
  },
  // EditItem.js & AddItem.js styles
  // Renamed from 'hTitle' for consistency with headerTitle below
  screenHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  // Renamed from 'label' to resolve conflict
  formFieldLabel: { fontWeight: 'bold', marginTop: 14, color: '#333' },
  // Renamed from 'input' to resolve conflict and match CustomInput component
  customInput: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    fontSize: 16,
  },
  // Renamed from 'photo' to match PhotoContainer component
  photoContainer: { width: 100, height: 100, borderRadius: 10, marginTop: 6, backgroundColor: '#e0e0e0' },
  // Renamed from 'pickImageBtn' to match PickImageButton component
  pickImageButton: {
    marginTop: 10,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickImageTxt: {
    color: '#fff',
    fontSize: 14,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  qty: { fontSize: 36, marginRight: 8, color: '#333' },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  confirmDeleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  confirmDeleteBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: '80%',
  },
  confirmDeleteText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmDeleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  // ConnectBasket.js styles
  connectBasketHeader: {
    backgroundColor: '#B04638',
    paddingTop: 34,
    paddingBottom: 16,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: { padding: 4 },
  subLabel: {
    fontWeight: 'bold',
    marginTop: 20,
    marginHorizontal: 22,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  connectBasketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
    borderRadius: 16,
    marginHorizontal: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  basketImg: { width: 40, height: 40, resizeMode: 'contain' },
  basketName: {
    flex: 1,
    marginLeft: 18,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  // _layout.js styles
  layoutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  layoutLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Renamed from 'header' to match HeaderContainer component and usage in EditItem.js
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B04638',
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 8,
  },
  // Renamed from 'content' to match ContentContainer component and usage in EditItem.js
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  photoSection: {
    flex: 1,
  },
  quantitySection: {
    flex: 1,
    marginLeft: 16,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: darkLight,
    borderRadius: 8,
    padding: 12,
  },
  qtyText: {
    fontSize: 20,
    fontWeight: '500',
  }
});

export { styles };