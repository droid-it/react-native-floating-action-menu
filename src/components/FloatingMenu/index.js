import React from 'react';
import { Text, View, TouchableWithoutFeedback, Animated } from 'react-native';

import FloatingItem from '@/components/FloatingItem';
import { Colors, Design, MenuPositions } from '@/constants';
import { applyButtonWidth } from '@/helpers';

import globalStyles from '@/styles';
import styles from './styles';

class FloatingMenu extends React.PureComponent {
  state = {
    dimmerActive: false,
    menuButtonDown: false,
    itemsDown: {},
  };

  menuPressAnimation = new Animated.Value(0);
  itemPressAnimations = {};
  itemFanAnimations = {};
  dimmerTimeout = null;

  componentDidMount() {
    this.initAnimations();
  }

  componentDidUpdate(prevProps) {
    const { items, isOpen } = this.props;

    if (prevProps.items.length !== items.length) {
      this.initAnimations();
    }

    if (prevProps.isOpen && !isOpen) {
      // Close menu
      this.toggleMenu(false);
    } else if (!prevProps.isOpen && isOpen) {
      // Open menu
      this.toggleMenu(true);
    }
  }

  initAnimations = () => {
    const { items } = this.props;

    if (!this.menuPressAnimation)
      this.menuPressAnimation = new Animated.Value(0);
    for (let i = 0; i < items.length; i++) {
      if (!this.itemPressAnimations[i]) {
        this.itemPressAnimations[i] = new Animated.Value(0);
      }
      if (i < items.length && !this.itemFanAnimations[i]) {
        this.itemFanAnimations[i] = new Animated.Value(0);
      }
    }
  };

  handleItemPressIn = (index, animatedValue, useNativeDriver = false) => () => {
    // Animate in
    Animated.timing(animatedValue, {
      // fromValue: 0.0,
      toValue: 1.0,
      duration: 14,
      useNativeDriver,
    }).start();

    if (index === null) {
      this.setState({ menuButtonDown: true });
    } else {
      this.setState({ itemsDown: { ...this.state.itemsDown, [index]: true } });
    }
  };

  handleItemPressOut = (
    index,
    animatedValue,
    useNativeDriver = false
  ) => () => {
    // Animate out
    Animated.timing(animatedValue, {
      // fromValue: 1.0,
      toValue: 0.0,
      duration: 142,
      useNativeDriver,
    }).start();

    if (index === null) {
      this.setState({ menuButtonDown: false });
    } else {
      this.setState({ itemsDown: { ...this.state.itemsDown, [index]: false } });
    }
  };

  handleItemPress = index => () => {
    const { items, onItemPress } = this.props;
    const item = items[index];

    if (!item) return;

    if (item.onPress) {
      item.onPress(item, index);
    } else if (onItemPress) {
      onItemPress(item, index);
    }
  };

  handleMenuPress = () => {
    const { isOpen, onMenuPress } = this.props;

    onMenuPress(!isOpen);
  };

  toggleMenu = isOpen => {
    const { items } = this.props;

    const options = {
      // fromValue: isOpen ? 0.0 : 1.0,
      toValue: isOpen ? 1.0 : 0.0,
      duration: 142 - Math.max(items.length - 2, 0) * 5,
      tension: 30,
      friction: 5,
      useNativeDriver: true,
    };

    // Fan items
    let totalDelay = 0;
    for (let i = 0; i < items.length; i++) {
      const delay =
        (items.length - i - 1) * Math.min(Math.max(40 - i * 8, 0), 180);
      totalDelay = totalDelay + delay;
      Animated.delay(delay).start(() => {
        Animated.spring(this.itemFanAnimations[i], options).start();
      });
    }

    // Toggle dimmer
    this.dimmerTimeout && clearTimeout(this.dimmerTimeout);
    if (isOpen) {
      this.setState({ dimmerActive: true });
    } else {
      // Deactivate dimmer after animation completes
      this.dimmerTimeout = setTimeout(() => {
        this.setState({ dimmerActive: false });
      }, Math.max(totalDelay, 180));
    }
  };

  renderItems = () => {
    const {
      items,
      renderItemIcon,
      isOpen,
      buttonWidth,
      innerWidth,
      primaryColor,
    } = this.props;
    const { itemsDown, dimmerActive } = this.state;

    if (!dimmerActive) return null;

    return items.map((item, index) => {
      return (
        <FloatingItem
          key={`item-${index}`}
          {...item}
          item={item}
          index={index}
          icon={
            renderItemIcon
              ? renderItemIcon({ ...this.state, item, index })
              : null
          }
          isOpen={isOpen || dimmerActive}
          primaryColor={primaryColor}
          buttonWidth={buttonWidth}
          innerWidth={innerWidth}
          numItems={items.length}
          itemsDown={itemsDown}
          itemFanAnimations={this.itemFanAnimations}
          itemPressAnimations={this.itemPressAnimations}
          onPress={this.handleItemPress(index)}
          onPressIn={this.handleItemPressIn(
            index,
            this.itemPressAnimations[index]
          )}
          onPressOut={this.handleItemPressOut(
            index,
            this.itemPressAnimations[index]
          )}
        />
      );
    });
  };

  renderMenuButton = () => {
    const {
      renderMenuIcon,
      isOpen,
      primaryColor,
      buttonWidth,
      innerWidth,
    } = this.props;
    const { menuButtonDown } = this.state;

    const backgroundColor = this.menuPressAnimation.interpolate({
      inputRange: [0.0, 1.0],
      outputRange: ['#ffffff', primaryColor],
    });

    const content = renderMenuIcon ? (
      renderMenuIcon({ ...this.state })
    ) : (
      <Text
        style={[
          globalStyles.missingIcon,
          isOpen ? styles.closeIcon : styles.menuIcon,
          { color: menuButtonDown ? '#fff' : primaryColor },
        ]}
      >
        {isOpen ? '×' : '☰'}
      </Text>
    );

    return (
      <View
        style={[
          globalStyles.buttonOuter,
          applyButtonWidth(buttonWidth),
          { borderColor: primaryColor },
        ]}
      >
        <TouchableWithoutFeedback
          style={globalStyles.button}
          onPressIn={this.handleItemPressIn(null, this.menuPressAnimation)}
          onPressOut={this.handleItemPressOut(null, this.menuPressAnimation)}
          onPress={this.handleMenuPress}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Animated.View
            style={[
              globalStyles.buttonInner,
              applyButtonWidth(innerWidth),
              { backgroundColor },
            ]}
          >
            {content}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    );
  };

  renderDimmer = () => {
    const { isOpen, items, dimmerStyle } = this.props;
    const { dimmerActive } = this.state;

    const fanAnimation = this.itemFanAnimations[0];
    const opacity =
      fanAnimation &&
      fanAnimation.interpolate({
        inputRange: [0.0, 1.0],
        outputRange: [0.5, 1.0],
        extrapolate: 'clamp',
      });

    return dimmerActive && items.length ? (
      <TouchableWithoutFeedback
        disabled={!isOpen}
        onPress={this.handleMenuPress}
      >
        <Animated.View
          style={[globalStyles.dimmer, styles.dimmer, dimmerStyle, { opacity }]}
        />
      </TouchableWithoutFeedback>
    ) : null;
  };

  render = () => {
    const { position } = this.props;

    const [vPos, hPos] = position.split('-');

    console.log('vPos', vPos);
    console.log('hPos', hPos);

    return (
      <View style={styles.container} pointerEvents="box-none">
        <View
          style={[
            styles.itemContainer,
            {
              [vPos]: 38,
              [hPos]: 38,
            },
          ]}
          pointerEvents="box-none"
        >
          {this.renderItems()}
          {this.renderMenuButton()}
        </View>
        {this.renderDimmer()}
      </View>
    );
  };
}

FloatingMenu.defaultProps = {
  primaryColor: Colors.primaryColor,
  buttonWidth: Design.buttonWidth,
  innerWidth: Design.buttonWidth - 12,
  position: MenuPositions.bottomRight,
};

export default FloatingMenu;
